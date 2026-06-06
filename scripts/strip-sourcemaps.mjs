/**
 * Strip source maps from a build-output directory before packaging.
 *
 * Removes every `*.map` file and the trailing `sourceMappingURL` comment that
 * webpack and the copied component styles leave in `.js` / `.css` files, so the
 * released zip ships no source maps. Runs against a target dir passed as the
 * first argument (default `dist-temp`, the packaging staging dir) — the local
 * `dist/` keeps its maps for debugging.
 */
import { existsSync, readdirSync, statSync, readFileSync, writeFileSync, rmSync } from 'fs'
import path from 'path'

const target = path.resolve(process.cwd(), process.argv[2] || 'dist-temp')

if (!existsSync(target)) {
  console.error(`strip-sourcemaps: target not found: ${target}`)
  process.exit(1)
}

let mapsRemoved = 0
let commentsStripped = 0

function walk (dir) {
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry)
    if (statSync(full).isDirectory()) { walk(full); continue }
    if (full.endsWith('.map')) {
      rmSync(full)
      mapsRemoved++
      continue
    }
    if (/\.(js|css)$/.test(full)) {
      const original = readFileSync(full, 'utf8')
      const stripped = original
        .replace(/[\t ]*\/\*#\s*sourceMappingURL=[^*]*\*\/[\t ]*\r?\n?/g, '')
        .replace(/[\t ]*\/\/#\s*sourceMappingURL=\S*[\t ]*\r?\n?/g, '')
      if (stripped !== original) {
        writeFileSync(full, stripped)
        commentsStripped++
      }
    }
  }
}

walk(target)
console.log(`strip-sourcemaps: removed ${mapsRemoved} .map file(s), stripped ${commentsStripped} sourceMappingURL comment(s) in ${path.relative(process.cwd(), target) || '.'}`)
