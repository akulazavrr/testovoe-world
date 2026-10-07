# Generates the painterly background layers and trees for the main map.
# Usage: powershell -ExecutionPolicy Bypass -File tools\generate-world.ps1
# Output: assets/map/sky.svg, mountains.svg, land.svg, water.svg, tree-1..3.svg
# Change $Seed to get a different random arrangement of the same scene.

param([int]$Seed = 7)

$ErrorActionPreference = 'Stop'
$out = Join-Path $PSScriptRoot '..\assets\map'
$rnd = New-Object System.Random $Seed
$inv = [Globalization.CultureInfo]::InvariantCulture

function F($v) { ([double]$v).ToString('0.#', $inv) }
function Rand([double]$a, [double]$b) { $a + $rnd.NextDouble() * ($b - $a) }
function Pick($arr) { $arr[$rnd.Next($arr.Count)] }
function Save($name, $text) {
  [IO.File]::WriteAllText((Join-Path $out $name), $text, (New-Object Text.UTF8Encoding $false))
  Write-Host "saved $name"
}

# Shared SVG filters: uneven brush-like edges and soft blur
$filters = @'
<filter id="brush" x="-5%" y="-5%" width="110%" height="110%">
  <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="2" seed="4"/>
  <feDisplacementMap in="SourceGraphic" scale="7"/>
</filter>
<filter id="soft" x="-20%" y="-20%" width="140%" height="140%">
  <feGaussianBlur stdDeviation="14"/>
</filter>
'@

# Point on a cubic Bezier curve
function Bez($p0, $p1, $p2, $p3, $t) {
  $u = 1 - $t
  $x = ($u*$u*$u*$p0[0]) + (3*$u*$u*$t*$p1[0]) + (3*$u*$t*$t*$p2[0]) + ($t*$t*$t*$p3[0])
  $y = ($u*$u*$u*$p0[1]) + (3*$u*$u*$t*$p1[1]) + (3*$u*$t*$t*$p2[1]) + ($t*$t*$t*$p3[1])
  return @($x, $y)
}

# =================== SKY: soft clouds and birds (1600x900) ===================
$sb = New-Object Text.StringBuilder
[void]$sb.Append('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMin slice">')
[void]$sb.Append("<defs>$filters<filter id=`"puff`"><feGaussianBlur stdDeviation=`"3`"/></filter></defs>")
$clouds = @(@(120, 120, 1.0), @(420, 260, 0.7), @(1180, 110, 1.1), @(1460, 290, 0.8), @(780, 330, 0.55), @(260, 400, 0.5), @(1320, 420, 0.5))
foreach ($c in $clouds) {
  $cx = $c[0]; $cy = $c[1]; $s = $c[2]
  [void]$sb.Append('<g filter="url(#puff)" opacity="0.9">')
  for ($i = 0; $i -lt 9; $i++) {
    $px = $cx + (Rand -110 110) * $s; $py = $cy + (Rand -18 10) * $s; $r = (Rand 26 48) * $s
    [void]$sb.Append("<ellipse cx=`"$(F $px)`" cy=`"$(F ($py + 8*$s))`" rx=`"$(F ($r*1.3))`" ry=`"$(F ($r*0.75))`" fill=`"#e4ecf8`"/>")
  }
  for ($i = 0; $i -lt 9; $i++) {
    $px = $cx + (Rand -100 100) * $s; $py = $cy + (Rand -26 0) * $s; $r = (Rand 22 42) * $s
    [void]$sb.Append("<ellipse cx=`"$(F $px)`" cy=`"$(F $py)`" rx=`"$(F ($r*1.3))`" ry=`"$(F ($r*0.75))`" fill=`"#ffffff`"/>")
  }
  [void]$sb.Append('</g>')
}
# Birds stay at the far sides: phones crop them away, so they never cover the subtitle
foreach ($b in @(@(150, 230), @(190, 210), @(230, 245), @(1380, 250), @(1415, 235))) {
  $x = $b[0]; $y = $b[1]
  [void]$sb.Append("<path d=`"M$x $y q8 -8 14 0 q6 -8 14 0`" fill=`"none`" stroke=`"#3a3f55`" stroke-width=`"2.5`" stroke-linecap=`"round`" opacity=`"0.55`"/>")
}
[void]$sb.Append('</svg>')
Save 'sky.svg' $sb.ToString()

# =================== MOUNTAINS (1600x360) ===================
# Peaks must stay in the top ~120 units: on wide screens the lower part is hidden behind the land.
function Ridge($minY, $maxY, $stepMin, $stepMax) {
  $pts = @(); $x = -60
  while ($x -lt 1700) {
    $pts += ,@($x, (Rand $minY $maxY))
    $x += Rand $stepMin $stepMax
    $pts += ,@($x, (Rand ($maxY + 30) ($maxY + 70)))
    $x += Rand ($stepMin * 0.6) ($stepMax * 0.6)
  }
  return ,$pts
}
function RidgePath($pts) {
  $d = 'M-60 360 '
  foreach ($p in $pts) { $d += "L$(F $p[0]) $(F $p[1]) " }
  return $d + 'L1700 360 Z'
}

$sb = New-Object Text.StringBuilder
[void]$sb.Append('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 360" preserveAspectRatio="xMidYMin slice">')
[void]$sb.Append("<defs>$filters<linearGradient id=`"haze`" x1=`"0`" y1=`"0`" x2=`"0`" y2=`"1`"><stop offset=`"0.3`" stop-color=`"#eef4fb`" stop-opacity=`"0`"/><stop offset=`"1`" stop-color=`"#eef4fb`" stop-opacity=`"0.7`"/></linearGradient></defs>")
[void]$sb.Append('<g filter="url(#brush)">')
$layers = @(
  @{ min = 8;  max = 45;  step = @(140, 220); fill = '#bccce9'; shade = '#a9bce0'; snow = $true },
  @{ min = 40; max = 80;  step = @(120, 190); fill = '#9fb5de'; shade = '#8aa2d3'; snow = $false },
  @{ min = 72; max = 110; step = @(100, 170); fill = '#869fd0'; shade = '#728cc2'; snow = $false }
)
foreach ($l in $layers) {
  $pts = Ridge $l.min $l.max $l.step[0] $l.step[1]
  [void]$sb.Append("<path d=`"$(RidgePath $pts)`" fill=`"$($l.fill)`"/>")
  # Shadow side of every peak (light comes from the left)
  for ($i = 0; $i -lt $pts.Count - 1; $i += 2) {
    $p = $pts[$i]; $v = $pts[$i + 1]
    [void]$sb.Append("<path d=`"M$(F $p[0]) $(F $p[1]) L$(F $v[0]) $(F $v[1]) L$(F ($v[0] - 12)) 360 L$(F ($p[0] + 10)) 360 Z`" fill=`"$($l.shade)`" opacity=`"0.8`"/>")
    if ($l.snow -and $p[1] -lt 30) {
      $w = 22
      [void]$sb.Append("<path d=`"M$(F $p[0]) $(F $p[1]) L$(F ($p[0] + $w)) $(F ($p[1] + 18)) L$(F ($p[0] + 6)) $(F ($p[1] + 13)) L$(F ($p[0] - 6)) $(F ($p[1] + 20)) L$(F ($p[0] - $w*0.8)) $(F ($p[1] + 16)) Z`" fill=`"#f4f8fd`"/>")
    }
  }
}
[void]$sb.Append('</g><rect width="1600" height="360" fill="url(#haze)"/></svg>')
Save 'mountains.svg' $sb.ToString()

# =================== LAND (1600x420) ===================
# Top edge is a row of distant tree crowns. The middle of the picture (x 430..1170)
# is what phones see, the full width is what wide screens see.
$greens = @('#4f8f3a', '#6fae3f', '#5d9b3c', '#a9d24e', '#cfe46a')
$flowers = @('#fdffb6', '#ffd6a5', '#ffadad', '#ffffff', '#ffc6ff', '#fdffb6')
$sb = New-Object Text.StringBuilder
[void]$sb.Append('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 420" preserveAspectRatio="xMidYMin slice">')
[void]$sb.Append("<defs>$filters</defs>")

# Distant tree line
[void]$sb.Append('<g filter="url(#brush)">')
for ($x = -10; $x -lt 1620; $x += (Rand 12 20)) {
  $r = Rand 9 17
  [void]$sb.Append("<circle cx=`"$(F $x)`" cy=`"$(F (Rand 18 26))`" r=`"$(F $r)`" fill=`"$(Pick @('#4a8443', '#568f4b', '#3f7a3d'))`"/>")
  if ($rnd.NextDouble() -lt 0.5) {
    [void]$sb.Append("<circle cx=`"$(F ($x - 3))`" cy=`"$(F (Rand 16 22))`" r=`"$(F ($r*0.5))`" fill=`"#7aae55`" opacity=`"0.8`"/>")
  }
}
# Meadow base
[void]$sb.Append('<path d="M0 28 C200 22 400 34 600 28 S1000 22 1200 30 S1500 26 1600 28 L1600 420 L0 420 Z" fill="#86c34f"/>')
[void]$sb.Append('</g>')

# Large light and dark patches, blurred like wide brush strokes
for ($i = 0; $i -lt 26; $i++) {
  $fill = Pick @('#5e9f3e', '#b5d955', '#9ccc4c', '#4f8f3a')
  [void]$sb.Append("<ellipse cx=`"$(F (Rand 0 1600))`" cy=`"$(F (Rand 60 420))`" rx=`"$(F (Rand 70 200))`" ry=`"$(F (Rand 14 40))`" fill=`"$fill`" opacity=`"0.45`" filter=`"url(#soft)`"/>")
}

# Grass blades: shorter far away (top), longer near (bottom)
[void]$sb.Append('<g stroke-linecap="round" opacity="0.75">')
for ($i = 0; $i -lt 2600; $i++) {
  $x = Rand 0 1600; $y = Rand 34 420
  $k = $y / 420
  $len = 3 + $k * 11
  $a = (Rand -115 -65) * [Math]::PI / 180
  $x2 = $x + [Math]::Cos($a) * $len; $y2 = $y + [Math]::Sin($a) * $len
  [void]$sb.Append("<path d=`"M$(F $x) $(F $y) L$(F $x2) $(F $y2)`" stroke=`"$(Pick $greens)`" stroke-width=`"$(F (1.2 + $k*1.8))`"/>")
}
[void]$sb.Append('</g>')

# Path from the house down to the shore
$seg1 = @(@(800, 26), @(840, 80), @(740, 120), @(790, 180))
$seg2 = @(@(790, 180), @(840, 240), @(690, 320), @(760, 420))
$pathD = 'M800 26 C840 80 740 120 790 180 C840 240 690 320 760 420'
[void]$sb.Append("<g filter=`"url(#brush)`"><path d=`"$pathD`" fill=`"none`" stroke=`"#b8c6dd`" stroke-width=`"44`" stroke-linecap=`"round`"/>")
[void]$sb.Append("<path d=`"$pathD`" fill=`"none`" stroke=`"#d8e1ee`" stroke-width=`"34`" stroke-linecap=`"round`"/>")
[void]$sb.Append("<path d=`"$pathD`" fill=`"none`" stroke=`"#eef2f8`" stroke-width=`"6`" stroke-linecap=`"round`" stroke-dasharray=`"18 26`" opacity=`"0.8`"/></g>")

# Flowers in the grass
for ($i = 0; $i -lt 320; $i++) {
  $y = Rand 40 420
  [void]$sb.Append("<circle cx=`"$(F (Rand 0 1600))`" cy=`"$(F $y)`" r=`"$(F ((Rand 1 1.8) * (0.6 + $y/420)))`" fill=`"$(Pick $flowers)`"/>")
}

# Lamp posts along the path
foreach ($t in @(0.25, 0.75)) {
  foreach ($seg in @($seg1, $seg2)) {
    $p = Bez $seg[0] $seg[1] $seg[2] $seg[3] $t
    foreach ($side in @(-1, 1)) {
      $k = 0.5 + $p[1] / 420
      $x = $p[0] + $side * 30 * $k; $y = $p[1]
      $h = 30 * $k
      [void]$sb.Append("<ellipse cx=`"$(F ($x + 4))`" cy=`"$(F $y)`" rx=`"$(F (5*$k))`" ry=`"$(F (1.6*$k))`" fill=`"#2f5e2f`" opacity=`"0.35`"/>")
      [void]$sb.Append("<path d=`"M$(F $x) $(F $y) L$(F $x) $(F ($y - $h))`" stroke=`"#3a3f55`" stroke-width=`"$(F (2*$k))`" stroke-linecap=`"round`"/>")
      [void]$sb.Append("<circle cx=`"$(F $x)`" cy=`"$(F ($y - $h - 2*$k))`" r=`"$(F (6*$k))`" fill=`"#fdffb6`" opacity=`"0.45`"/>")
      [void]$sb.Append("<rect x=`"$(F ($x - 2.6*$k))`" y=`"$(F ($y - $h - 5*$k))`" width=`"$(F (5.2*$k))`" height=`"$(F (6*$k))`" rx=`"$(F (1.5*$k))`" fill=`"#fffbe0`" stroke=`"#3a3f55`" stroke-width=`"$(F (1*$k))`"/>")
    }
  }
}

# Tiny people walking and running on the path
$clothes = @('#ef8d88', '#ffd6a5', '#5b8fd6', '#bdb2ff', '#ffadad', '#fdffb6', '#ffffff', '#e8675b', '#14a89b')
$skins = @('#f1c8a8', '#d9a882', '#b98462')
$people = @(@(1, 0.12, -8), @(1, 0.4, 6), @(1, 0.62, -4), @(1, 0.9, 7), @(2, 0.2, -6), @(2, 0.38, 5), @(2, 0.55, -7), @(2, 0.78, 4), @(2, 0.92, -3))
foreach ($pp in $people) {
  $seg = if ($pp[0] -eq 1) { $seg1 } else { $seg2 }
  $p = Bez $seg[0] $seg[1] $seg[2] $seg[3] $pp[1]
  $k = 0.45 + $p[1] / 420
  $x = $p[0] + $pp[2] * $k; $y = $p[1] + 4 * $k
  $dir = Pick @(-1, 1)
  $shirt = Pick $clothes; $pants = Pick @('#3a3f55', '#2f3b66', '#5a4a6e', '#3a3f55')
  [void]$sb.Append("<g transform=`"translate($(F $x) $(F $y)) scale($(F ($k*$dir)) $(F $k))`" stroke-linecap=`"round`">")
  [void]$sb.Append('<ellipse cx="0" cy="0" rx="6" ry="1.6" fill="#556b7a" opacity="0.3"/>')
  [void]$sb.Append("<path d=`"M0 -10 L-4 0 M0 -10 L4 -2 L6 0`" stroke=`"$pants`" stroke-width=`"2.6`" fill=`"none`"/>")
  [void]$sb.Append("<path d=`"M-1 -18 L-5 -12 M1 -18 L5 -14`" stroke=`"$(Pick $skins)`" stroke-width=`"1.8`" fill=`"none`"/>")
  [void]$sb.Append("<rect x=`"-3`" y=`"-20`" width=`"6`" height=`"10`" rx=`"2.5`" fill=`"$shirt`"/>")
  [void]$sb.Append("<circle cx=`"0.5`" cy=`"-23.5`" r=`"3`" fill=`"$(Pick $skins)`"/>")
  [void]$sb.Append("<path d=`"M-2.8 -24 a3 3 0 0 1 6 -1`" fill=`"$(Pick @('#3a2a22', '#6b4a2e', '#e8c26a', '#2a2a4a'))`"/>")
  [void]$sb.Append('</g>')
}
[void]$sb.Append('</svg>')
Save 'land.svg' $sb.ToString()

# =================== WATER (1600x500) ===================
$sb = New-Object Text.StringBuilder
[void]$sb.Append('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 500" preserveAspectRatio="xMidYMin slice">')
[void]$sb.Append("<defs>$filters<linearGradient id=`"deep`" x1=`"0`" y1=`"0`" x2=`"0`" y2=`"500`" gradientUnits=`"userSpaceOnUse`"><stop offset=`"0`" stop-color=`"#8fc4f2`"/><stop offset=`"0.45`" stop-color=`"#5c9be0`"/><stop offset=`"1`" stop-color=`"#3b6cc0`"/></linearGradient></defs>")
[void]$sb.Append('<g filter="url(#brush)">')
[void]$sb.Append('<path d="M0 4 C200 0 400 10 600 6 S1000 0 1200 8 S1500 2 1600 6 L1600 500 L0 500 Z" fill="#efd7a8"/>')
[void]$sb.Append('<path d="M0 16 C150 10 300 22 450 16 S750 10 900 18 S1200 10 1350 16 S1550 12 1600 16 L1600 500 L0 500 Z" fill="url(#deep)"/>')
[void]$sb.Append('</g>')
[void]$sb.Append('<path d="M0 18 C150 12 300 24 450 18 S750 12 900 20 S1200 12 1350 18 S1550 14 1600 18" fill="none" stroke="#ffffff" stroke-width="3" opacity="0.8" filter="url(#brush)"/>')
# Soft lighter and darker zones
for ($i = 0; $i -lt 14; $i++) {
  [void]$sb.Append("<ellipse cx=`"$(F (Rand 0 1600))`" cy=`"$(F (Rand 60 500))`" rx=`"$(F (Rand 120 260))`" ry=`"$(F (Rand 18 40))`" fill=`"$(Pick @('#a9d3f7', '#4a84d2'))`" opacity=`"0.35`" filter=`"url(#soft)`"/>")
}
# Ripples and glints
[void]$sb.Append('<g stroke-linecap="round" fill="none">')
for ($i = 0; $i -lt 230; $i++) {
  $y = Rand 30 500; $k = 0.4 + $y / 500
  $x = Rand 0 1600; $len = (Rand 8 34) * $k
  $light = $rnd.NextDouble() -lt 0.65
  $col = if ($light) { '#e6f3ff' } else { '#3a68b5' }
  $op = if ($light) { Rand 0.45 0.9 } else { Rand 0.25 0.45 }
  [void]$sb.Append("<path d=`"M$(F $x) $(F $y) q$(F ($len/2)) $(F (-2.5*$k)) $(F $len) 0`" stroke=`"$col`" stroke-width=`"$(F (1.4 + 1.6*$k))`" opacity=`"$(F $op)`"/>")
}
[void]$sb.Append('</g></svg>')
Save 'water.svg' $sb.ToString()

# =================== TREES ===================
$leafShades = @('#d0e45e', '#9ccb45', '#68ab3d', '#438e3b', '#2f6e35')  # light -> dark
function Tree($name, $w, $h, $foliage, $trunkTop, $branches) {
  $sb = New-Object Text.StringBuilder
  [void]$sb.Append("<svg xmlns=`"http://www.w3.org/2000/svg`" viewBox=`"0 0 $w $h`">")
  [void]$sb.Append("<defs>$filters</defs>")
  $cx = $w / 2; $ground = $h - 10
  # Shadow on the grass
  [void]$sb.Append("<ellipse cx=`"$(F ($cx + 8))`" cy=`"$(F $ground)`" rx=`"$(F ($w*0.36))`" ry=`"$(F 8)`" fill=`"#2f5e2f`" opacity=`"0.35`"/>")
  # Trunk and branches
  [void]$sb.Append('<g stroke="#5a3d2e" stroke-linecap="round" fill="none" filter="url(#brush)">')
  [void]$sb.Append("<path d=`"M$(F $cx) $(F $ground) C$(F ($cx - 4)) $(F ($ground - 40)) $(F ($cx + 6)) $(F ($trunkTop + 30)) $(F $cx) $(F $trunkTop)`" stroke-width=`"$(F ($w*0.07))`"/>")
  foreach ($b in $branches) {
    [void]$sb.Append("<path d=`"M$(F $cx) $(F $b[0]) Q$(F ($cx + $b[1]*0.5)) $(F ($b[0] - 10)) $(F ($cx + $b[1])) $(F ($b[0] + $b[2]))`" stroke-width=`"$(F ($w*0.03))`"/>")
  }
  [void]$sb.Append('</g>')
  # Foliage: dark base, then leaf blobs, lighter towards the upper left
  $blobs = @()
  foreach ($f in $foliage) {
    [void]$sb.Append("<ellipse cx=`"$(F $f[0])`" cy=`"$(F $f[1])`" rx=`"$(F ($f[2]*0.85))`" ry=`"$(F ($f[3]*0.85))`" fill=`"#2f6e35`" filter=`"url(#brush)`"/>")
    for ($i = 0; $i -lt 70; $i++) {
      $ang = Rand 0 (2 * [Math]::PI); $rad = [Math]::Sqrt($rnd.NextDouble())
      $dx = [Math]::Cos($ang) * $rad; $dy = [Math]::Sin($ang) * $rad
      $t = $dx * 0.45 + $dy * 0.75
      $idx = [Math]::Floor((($t + 1) / 2) * 5 + (Rand -0.9 0.9))
      $idx = [Math]::Max(0, [Math]::Min(4, $idx))
      $blobs += ,@(($f[0] + $dx * $f[2]), ($f[1] + $dy * $f[3]), (Rand ($f[2]*0.14) ($f[2]*0.26)), $idx)
    }
  }
  [void]$sb.Append('<g filter="url(#brush)">')
  foreach ($bl in ($blobs | Sort-Object { -$_[3] })) {
    [void]$sb.Append("<ellipse cx=`"$(F $bl[0])`" cy=`"$(F $bl[1])`" rx=`"$(F $bl[2])`" ry=`"$(F ($bl[2]*0.8))`" fill=`"$($leafShades[$bl[3]])`"/>")
  }
  [void]$sb.Append('</g>')
  # A few branches visible through the leaves
  [void]$sb.Append('<g stroke="#4a3328" stroke-linecap="round" fill="none" opacity="0.85">')
  foreach ($b in $branches) {
    $ex = $cx + $b[1] * 0.8; $ey = $b[0] - 6
    [void]$sb.Append("<path d=`"M$(F ($cx + $b[1]*0.3)) $(F ($b[0] - 2)) L$(F $ex) $(F $ey)`" stroke-width=`"$(F ($w*0.018))`"/>")
  }
  [void]$sb.Append('</g></svg>')
  Save $name $sb.ToString()
}

# Big round tree
Tree 'tree-1.svg' 200 240 @(@(100, 92, 84, 72), @(58, 110, 46, 40), @(146, 112, 48, 40), @(100, 52, 56, 44)) 150 @(@(160, -50, -30), @(150, 54, -34), @(128, -26, -40))
# Tall tree
Tree 'tree-2.svg' 150 260 @(@(75, 96, 60, 84), @(75, 60, 44, 50), @(48, 140, 32, 30), @(104, 136, 32, 30)) 170 @(@(180, -40, -40), @(168, 40, -44))
# Small bushy tree
Tree 'tree-3.svg' 160 150 @(@(80, 66, 66, 50), @(42, 82, 36, 30), @(120, 84, 36, 30)) 100 @(@(108, -34, -22), @(104, 36, -24))
