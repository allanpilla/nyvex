#!/usr/bin/env bash
# Baixa 64 rostos gerados por IA (StyleGAN, conjunto "100k-faces" de ozgrozer: pessoas que não existem)
# para public/faces/00.jpg … 63.jpg. Roda no build do GitHub Pages; o protótipo não depende do site externo.
set -u
OUT=public/faces; N=64; mkdir -p "$OUT"
i=0; n=0
while [ "$i" -lt "$N" ] && [ "$n" -lt 600 ]; do
  id=$(printf '%06d' "$n")
  url="https://ozgrozer.github.io/100k-faces/$((n / 10000))/$(((n / 1000) % 10))/$id.jpg"
  f="$OUT/$(printf '%02d' "$i").jpg"
  if curl -fsSL --retry 3 --retry-delay 1 -o "$f" "$url" && [ "$(head -c 3 "$f" | od -An -tx1 | tr -d ' ')" = "ffd8ff" ]; then
    i=$((i + 1))
  else
    rm -f "$f"
  fi
  n=$((n + 1))
done
echo "faces: $i de $N"
[ "$i" -eq "$N" ] || { echo "Não consegui baixar todos os rostos"; exit 1; }
