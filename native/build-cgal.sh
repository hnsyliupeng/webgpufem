#!/usr/bin/env bash
# Optional GPL-3-or-later CGAL Mesh_3 binary. No QuickJS or Python is needed.
set -euo pipefail
cd "$(dirname "$0")/.."
CXX=${CXX:-g++}
ARGS=(-std=c++17 -O1 -DNDEBUG -DCGAL_NO_CORE=1 -DCGAL_DISABLE_GMP=1 -Wno-deprecated-declarations)
if [[ -n "${CGAL_ROOT:-}" ]]; then
  [[ -d "$CGAL_ROOT" ]] || { echo 'CGAL_ROOT 不存在' >&2; exit 1; }
  while IFS= read -r -d '' dir; do ARGS+=("-I$dir"); done < <(find "$CGAL_ROOT" -maxdepth 2 -type d -name include -print0)
fi
if [[ -n "${BOOST_INCLUDE:-}" ]]; then ARGS+=("-I$BOOST_INCLUDE"); fi
"$CXX" "${ARGS[@]}" native/cgal-implicit.cpp -lpthread -ldl -lm -o native/cgal-implicit
printf '完成：native/cgal-implicit\n'

if [[ "${BUILD_PERIODIC:-0}" == 1 ]]; then
  "$CXX" "${ARGS[@]}" native/cgal-periodic.cpp -lpthread -ldl -lm -o native/cgal-periodic
  printf '完成：native/cgal-periodic\n'
fi
