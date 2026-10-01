# Prompts das imagens padrão do quiz de estilo

Banco padrão do NorteArq: **8 estilos × 3 ambientes = 24 imagens** (o quiz mostra até 24).
Os prompts estão em inglês porque as ferramentas de imagem respondem melhor assim.

## Como gerar

- **Formato:** 4:3 horizontal, pelo menos 1600 × 1200 px. No Midjourney, acrescente `--ar 4:3` no fim.
- **Mesmo padrão em todas:** foto realista, luz natural do dia, câmera na altura dos olhos, ângulo aberto.
  Assim o cliente reage ao estilo, não à qualidade da foto.
- **Sem pessoas, sem texto, sem logos e sem marcas.**
- **Evitar** (campo "negative prompt", se a ferramenta tiver):
  `people, person, text, watermark, logo, signature, cartoon, illustration, 3d render look, distorted furniture, extra legs, blurry, oversaturated`
- Gere 2 a 4 variações de cada e escolha a que deixa o estilo **mais óbvio**.
- Confira nos termos da ferramenta se o seu plano permite **uso comercial**.
- Nomeie os arquivos assim: `contemporaneo-sala.jpg`, `industrial-cozinha.jpg`… (o estilo do nome é o que vai no sistema).

## Parte fixa de todos os prompts

Todo prompt abaixo começa com a mesma frase, para manter o padrão:

> Professional interior design photograph, realistic, natural daylight, eye-level wide shot, magazine quality, no people, no text,

---

## 1. Contemporâneo (`contemporaneo`)

**Sala**
```
Professional interior design photograph, realistic, natural daylight, eye-level wide shot, magazine quality, no people, no text, contemporary living room in a Brazilian apartment, clean lines, warm neutral palette of greige and beige, large curved sofa in bouclé, travertine coffee table, slatted wood wall panel, sculptural pendant light, floor-to-ceiling windows, a few curated objects
```
**Cozinha**
```
Professional interior design photograph, realistic, natural daylight, eye-level wide shot, magazine quality, no people, no text, contemporary kitchen, handleless cabinets in warm greige, large kitchen island with light quartz top and waterfall edge, oak wood details, minimal brushed metal fixtures, linear pendant lights, open to dining area
```
**Quarto**
```
Professional interior design photograph, realistic, natural daylight, eye-level wide shot, magazine quality, no people, no text, contemporary master bedroom, upholstered headboard wall in neutral fabric, low platform bed with layered linen bedding in beige and taupe, wood nightstands, indirect LED lighting, sheer curtains, calm and sophisticated
```

## 2. Minimalista (`minimalista`)

**Sala**
```
Professional interior design photograph, realistic, natural daylight, eye-level wide shot, magazine quality, no people, no text, minimalist living room, white and off-white walls, almost empty space, one low white sofa, one simple side table, polished concrete floor, hidden storage, no decoration, lots of negative space, monochrome
```
**Cozinha**
```
Professional interior design photograph, realistic, natural daylight, eye-level wide shot, magazine quality, no people, no text, minimalist kitchen, flat white handleless cabinets, white solid surface countertop, no visible appliances, empty clean counters, single slim faucet, monochrome white, perfectly ordered, serene
```
**Quarto**
```
Professional interior design photograph, realistic, natural daylight, eye-level wide shot, magazine quality, no people, no text, minimalist bedroom, white walls, low simple bed with plain white bedding, no headboard, one small wooden stool as nightstand, built-in flush wardrobe, bare floor, empty space, quiet and essential
```

## 3. Industrial (`industrial`)

**Sala**
```
Professional interior design photograph, realistic, natural daylight, eye-level wide shot, magazine quality, no people, no text, industrial loft living room, exposed red brick wall, polished concrete floor, black steel framed windows, exposed ducts and pipes on the ceiling, cognac leather sofa, metal and reclaimed wood coffee table, Edison bulb pendants
```
**Cozinha**
```
Professional interior design photograph, realistic, natural daylight, eye-level wide shot, magazine quality, no people, no text, industrial kitchen, dark graphite cabinets, concrete countertop, black metal open shelving, subway tiles with dark grout, exposed brick, black steel pendant lamps, stools in metal and wood
```
**Quarto**
```
Professional interior design photograph, realistic, natural daylight, eye-level wide shot, magazine quality, no people, no text, industrial bedroom, burnt cement wall, black metal bed frame, grey and charcoal bedding, exposed electrical conduit, black steel framed glass partition, reclaimed wood nightstand, caged pendant light
```

## 4. Clássico (`classico`)

**Sala**
```
Professional interior design photograph, realistic, natural daylight, eye-level wide shot, magazine quality, no people, no text, classic elegant living room, white walls with boiserie moldings, symmetrical layout, tufted velvet sofa, pair of armchairs, crystal chandelier, marble fireplace, herringbone parquet floor, brass details
```
**Cozinha**
```
Professional interior design photograph, realistic, natural daylight, eye-level wide shot, magazine quality, no people, no text, classic kitchen, raised panel cabinets in soft white with brass handles, white marble countertops and backsplash, crown molding, range hood with molding detail, traditional pendant lanterns, checkerboard marble floor
```
**Quarto**
```
Professional interior design photograph, realistic, natural daylight, eye-level wide shot, magazine quality, no people, no text, classic bedroom, tall upholstered tufted headboard, symmetrical nightstands with table lamps, wall moldings, small crystal chandelier, heavy drapes, soft ivory and champagne palette, parquet floor
```

## 5. Escandinavo (`escandinavo`)

**Sala**
```
Professional interior design photograph, realistic, natural daylight, eye-level wide shot, magazine quality, no people, no text, scandinavian living room, white walls, light oak floor, light grey sofa with wool throws, simple wooden coffee table, sheepskin, potted plants, paper pendant lamp, cozy hygge atmosphere, bright and airy
```
**Cozinha**
```
Professional interior design photograph, realistic, natural daylight, eye-level wide shot, magazine quality, no people, no text, scandinavian kitchen, white cabinets with light oak fronts and countertops, open wooden shelves with ceramic dishes, white tiles, wooden dining table with spindle chairs, plants, bright and simple
```
**Quarto**
```
Professional interior design photograph, realistic, natural daylight, eye-level wide shot, magazine quality, no people, no text, scandinavian bedroom, white walls, light wood bed frame, white and light grey linen bedding, chunky knit blanket, wooden ladder with textiles, small plant, simple pendant lamp, airy and cozy
```

## 6. Rústico (`rustico`)

**Sala**
```
Professional interior design photograph, realistic, natural daylight, eye-level wide shot, magazine quality, no people, no text, rustic living room in a Brazilian country house, exposed rough timber ceiling beams, natural stone wall, terracotta floor tiles, linen sofa in earthy tones, solid wood coffee table, woven baskets, warm and handmade feeling
```
**Cozinha**
```
Professional interior design photograph, realistic, natural daylight, eye-level wide shot, magazine quality, no people, no text, rustic farmhouse kitchen, solid wood cabinets, thick wooden countertop, handmade ceramic tiles, wood burning stove, terracotta floor, copper pots hanging, exposed wooden beams, warm earthy palette
```
**Quarto**
```
Professional interior design photograph, realistic, natural daylight, eye-level wide shot, magazine quality, no people, no text, rustic bedroom, solid reclaimed wood bed, exposed wooden beams, whitewashed rough plaster walls, linen and cotton bedding in natural tones, woven rug, wrought iron lamp, cozy country house feeling
```

## 7. Boho (`boho`)

**Sala**
```
Professional interior design photograph, realistic, natural daylight, eye-level wide shot, magazine quality, no people, no text, bohemian living room, layered patterned rugs, low sofa with many textured cushions, rattan armchair, macramé wall hanging, lots of hanging and potted plants, terracotta, mustard and rust palette, eclectic and relaxed
```
**Cozinha**
```
Professional interior design photograph, realistic, natural daylight, eye-level wide shot, magazine quality, no people, no text, bohemian kitchen, patterned encaustic tiles, open shelves with colorful handmade ceramics, rattan pendant lights, plants everywhere, warm wood counters, woven baskets, terracotta accents, eclectic and lively
```
**Quarto**
```
Professional interior design photograph, realistic, natural daylight, eye-level wide shot, magazine quality, no people, no text, bohemian bedroom, low bed with layered textured bedding in terracotta and cream, rattan headboard, macramé, string of warm lights, many plants, kilim rug, floor cushions, free-spirited and cozy
```

## 8. Japandi (`japandi`)

**Sala**
```
Professional interior design photograph, realistic, natural daylight, eye-level wide shot, magazine quality, no people, no text, japandi living room, low wooden furniture, light oak and dark walnut contrast, linen sofa in muted beige, wabi-sabi ceramic vases, paper lantern floor lamp, shoji-inspired panels, muted earth tones, calm and balanced
```
**Cozinha**
```
Professional interior design photograph, realistic, natural daylight, eye-level wide shot, magazine quality, no people, no text, japandi kitchen, light wood cabinets with dark wood accents, matte stone countertop, handmade ceramic bowls, minimal open shelf, paper pendant lamp, muted earthy palette, serene and functional
```
**Quarto**
```
Professional interior design photograph, realistic, natural daylight, eye-level wide shot, magazine quality, no people, no text, japandi bedroom, low platform bed in light wood, linen bedding in sand and grey, dark wood bench, paper lantern, wabi-sabi vase with a single branch, sliding shoji-style panels, tranquil and minimal
```
