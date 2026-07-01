#!/bin/bash
# Converts the fithera admin from dark theme to a clean light, on-brand theme.
# Brand colors (purple #8c368c, pink #e71f69) and status colors (green/amber) are preserved.
# Backs up every file to .darkbak before changing.

set -e
cd "$(dirname "$0")"

FILES=$(grep -rl "const COLORS" src/)

echo "Backing up and converting these files:"
echo "$FILES"
echo ""

for f in $FILES; do
  cp "$f" "$f.darkbak"
done

# Use perl for reliable multi-file in-place replacement.
# IMPORTANT: order matters; replace longer/specific darks first.
# Dark backgrounds & surfaces -> light
perl -i -pe '
  s/#0a0a0f/#f4f2f6/gi;   # page background -> faint purple-gray
  s/#13131f/#ffffff/gi;   # card surface -> white
  s/#1a1a2e/#ffffff/gi;   # alt dark surface -> white
  s/#1a1a26/#faf9fb/gi;   # viewport bg -> very light
  s/#1e1e2e/#e6e2ec/gi;   # border -> light lavender-gray
  s/#2a2a3e/#f0edf3/gi;   # input/dark chip -> light
  s/#3a3a5e/#ded8e6/gi;   # darker chip border -> light
  s/#f1f1f3/#1d1d1b/gi;   # main text (light) -> brand black
  s/#9999aa/#6b6b76/gi;   # muted text -> medium gray
  s/#6b6b7b/#9a9aa5/gi;   # dim text -> lighter gray
  s/#7b8794/#9a9aa5/gi;   # stray dim -> lighter gray
  s/#9aa5b1/#9a9aa5/gi;   # stray dim -> lighter gray
  s/#888888/#9a9aa5/gi;   # stray gray -> dim
' $FILES

echo "Done. Brand colors (#8c368c, #e71f69), success green (#22c55e),"
echo "warning amber (#f59e0b), gradient stops (#cd80b4 #6bc8e8) left untouched."
echo ""
echo "If anything looks wrong, restore with:  for f in \$(grep -rl 'const COLORS' src/); do mv \"\$f.darkbak\" \"\$f\"; done"
