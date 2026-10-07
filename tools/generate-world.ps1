# Generates the painterly background layers and trees for the main map.
# Usage: powershell -ExecutionPolicy Bypass -File tools\generate-world.ps1
# Output: assets/map/sky.svg, mountains.svg, land.svg, water.svg, tree-1..3.svg
# (cloud.svg and the other map objects are drawn by hand, not generated)
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
# Few soft peaks of clearly different heights, shaded on the right and hatched like a pencil drawing.
# Peaks must stay in the top ~120 units: on wide screens the lower part is hidden behind the land.
function Ridge($peaks, $valleyMin, $valleyMax) {
  # $peaks: list of @(x, y). A valley is placed between every two peaks.
  $pts = @(,@(-200, (Rand $valleyMin $valleyMax)))
  for ($i = 0; $i -lt $peaks.Count; $i++) {
    $pts += ,$peaks[$i]
    $nextX = if ($i -lt $peaks.Count - 1) { $peaks[$i + 1][0] } else { 1800 }
    $pts += ,@((($peaks[$i][0] + $nextX) / 2 + (Rand -40 40)), (Rand $valleyMin $valleyMax))
  }
  return ,$pts
}
function RidgePath($pts) {
  # Smooth curve through the midpoints between points: rounded tops, soft valleys
  $d = "M-200 360 L$(F $pts[0][0]) $(F $pts[0][1]) "
  for ($i = 1; $i -lt $pts.Count - 1; $i++) {
    $mx = ($pts[$i][0] + $pts[$i + 1][0]) / 2; $my = ($pts[$i][1] + $pts[$i + 1][1]) / 2
    $d += "Q$(F $pts[$i][0]) $(F $pts[$i][1]) $(F $mx) $(F $my) "
  }
  $last = $pts[$pts.Count - 1]
  return $d + "L$(F $last[0]) $(F $last[1]) L1800 360 Z"
}

$sb = New-Object Text.StringBuilder
[void]$sb.Append('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 360" preserveAspectRatio="xMidYMin slice">')
[void]$sb.Append("<defs>$filters<linearGradient id=`"haze`" x1=`"0`" y1=`"0`" x2=`"0`" y2=`"1`"><stop offset=`"0.3`" stop-color=`"#eef4fb`" stop-opacity=`"0`"/><stop offset=`"1`" stop-color=`"#eef4fb`" stop-opacity=`"0.7`"/></linearGradient></defs>")
$layers = @(
  @{ peaks = @(@(180, 30), @(640, -16), @(1080, 46), @(1460, 4));  vmin = 110; vmax = 140; fill = '#bccce9'; shade = '#a6b9df'; hatch = '#8fa5d3'; light = '#d3def2'; snow = $true },
  @{ peaks = @(@(380, 70), @(900, 40), @(1300, 92));               vmin = 150; vmax = 175; fill = '#93abda'; shade = '#7c95cc'; hatch = '#6880bd'; light = '#acc1e5'; snow = $false }
)
$li = 0
foreach ($l in $layers) {
  $li++
  $pts = Ridge $l.peaks $l.vmin $l.vmax
  $ridgeD = RidgePath $pts
  [void]$sb.Append("<clipPath id=`"ridge$li`"><path d=`"$ridgeD`"/></clipPath>")
  [void]$sb.Append("<g filter=`"url(#brush)`"><path d=`"$ridgeD`" fill=`"$($l.fill)`"/>")
  [void]$sb.Append("<g clip-path=`"url(#ridge$li)`">")
  # Paper-cut planes (reference 7), light from the left: every peak gets a diagonal shadow
  # wedge along its right slope and a lighter fold on its left slope, both running down-right.
  for ($i = 1; $i -lt $pts.Count - 1; $i += 2) {
    $u = $pts[$i - 1]; $p = $pts[$i]; $v = $pts[$i + 1]
    $dxR = $v[0] - $p[0]; $dyL = $u[1] - $p[1]
    # Shadow: between the right slope and an inner edge that goes diagonally from the peak
    $ix = $p[0] + 0.7*$dxR; $iy = $v[1] + 30
    [void]$sb.Append("<path d=`"M$(F $p[0]) $(F ($p[1] - 30)) L$(F ($v[0] + 40)) $(F ($v[1] - 40)) L$(F $v[0]) $(F ($v[1] + 6)) L$(F ($v[0] + 30)) 360 L$(F ($p[0] + 0.5*$dxR)) 360 L$(F $ix) $(F $iy) Q$(F ($p[0] + 0.3*$dxR)) $(F ($p[1] + 0.45*($iy - $p[1]) + 12)) $(F $p[0]) $(F $p[1]) Z`" fill=`"$($l.shade)`"/>")
    # Darker strip at the top of the shadow, like a second layer of paper
    [void]$sb.Append("<path d=`"M$(F $p[0]) $(F $p[1]) L$(F ($p[0] + 0.42*$dxR)) $(F ($p[1] + 0.32*($v[1] - $p[1]) + 4)) L$(F ($p[0] + 0.3*$dxR)) $(F ($p[1] + 0.36*($v[1] - $p[1]) + 18)) Z`" fill=`"$($l.hatch)`" opacity=`"0.55`"/>")
    # Lighter fold on the lit left slope, parallel to the shadow
    $ax = $p[0] + ($u[0] - $p[0]) * 0.3; $ay = $p[1] + $dyL * 0.3
    $bx = $p[0] + ($u[0] - $p[0]) * 0.62; $by = $p[1] + $dyL * 0.62
    [void]$sb.Append("<path d=`"M$(F $ax) $(F $ay) L$(F ($ax + 0.45*$dxR)) $(F ($ay + 0.55*$dyL)) L$(F ($ax + 0.2*$dxR)) $(F ($ay + 0.7*$dyL)) L$(F $bx) $(F $by) Z`" fill=`"$($l.light)`" opacity=`"0.75`"/>")
    if ($l.snow -and $p[1] -lt 20) {
      $sx = $p[0]; $sy = $p[1] + 22
      [void]$sb.Append("<path d=`"M$(F ($sx - 90)) $(F ($sy - 60)) L$(F ($sx + 90)) $(F ($sy - 60)) L$(F ($sx + 52)) $(F ($sy + 18)) L$(F ($sx + 26)) $(F ($sy + 8)) L$(F ($sx + 6)) $(F ($sy + 24)) L$(F ($sx - 18)) $(F ($sy + 10)) L$(F ($sx - 44)) $(F ($sy + 20)) Z`" fill=`"#f4f8fd`" opacity=`"0.95`"/>")
    }
  }
  [void]$sb.Append('</g></g>')
}
[void]$sb.Append('<rect width="1600" height="360" fill="url(#haze)"/></svg>')
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
# Trunk forks into curved limbs that taper towards the tips; every limb and twig ends in a
# clump of leaves. Gaps between clumps let the limbs show through, like in the reference.
# The trunk base goes into the ground: root flare plus grass blades drawn over it.
$leafShades = @('#d0e45e', '#9ccb45', '#68ab3d', '#438e3b', '#2f6e35')  # light -> dark

# Filled tapering curve (quadratic Bezier) from width $w0 to width $w1
function Limb($x0, $y0, $qx, $qy, $x1, $y1, $w0, $w1) {
  $left = @(); $right = @()
  for ($i = 0; $i -le 12; $i++) {
    $t = $i / 12; $u = 1 - $t
    $px = $u*$u*$x0 + 2*$u*$t*$qx + $t*$t*$x1
    $py = $u*$u*$y0 + 2*$u*$t*$qy + $t*$t*$y1
    $dx = 2*$u*($qx - $x0) + 2*$t*($x1 - $qx); $dy = 2*$u*($qy - $y0) + 2*$t*($y1 - $qy)
    $len = [Math]::Max(0.001, [Math]::Sqrt($dx*$dx + $dy*$dy))
    $nx = -$dy / $len; $ny = $dx / $len
    $hw = ($w0 + ($w1 - $w0) * $t) / 2
    $left += "$(F ($px + $nx*$hw)) $(F ($py + $ny*$hw))"
    $right = @("$(F ($px - $nx*$hw)) $(F ($py - $ny*$hw))") + $right
  }
  return 'M' + (($left + $right) -join ' L') + ' Z'
}

function Tree($name, $w, $h, $trunkW, $forkY, $limbs, $clumpR) {
  $sb = New-Object Text.StringBuilder
  [void]$sb.Append("<svg xmlns=`"http://www.w3.org/2000/svg`" viewBox=`"0 0 $w $h`">")
  [void]$sb.Append("<defs>$filters</defs>")
  $cx = $w / 2; $ground = $h - 12
  $forkX = $cx + (Rand -4 4)

  # Shadow of the crown on the grass, tight at the trunk
  [void]$sb.Append("<ellipse cx=`"$(F ($cx + 10))`" cy=`"$(F ($ground + 2))`" rx=`"$(F ($w*0.34))`" ry=`"7`" fill=`"#2f5e2f`" opacity=`"0.28`"/>")
  [void]$sb.Append("<ellipse cx=`"$(F ($cx + 3))`" cy=`"$(F ($ground + 2))`" rx=`"$(F ($trunkW*1.4))`" ry=`"3.5`" fill=`"#24452a`" opacity=`"0.45`"/>")

  # Trunk, root flare, limbs and twigs
  $wood = New-Object Text.StringBuilder
  [void]$wood.Append("<path d=`"$(Limb $cx ($ground + 6) ($cx - 5) (($ground + $forkY) / 2) $forkX $forkY $trunkW ($trunkW*0.72))`"/>")
  foreach ($s in @(-1, 1)) {
    [void]$wood.Append("<path d=`"$(Limb $cx ($ground - 14) ($cx + $s*$trunkW*0.4) ($ground - 2) ($cx + $s*$trunkW*1.05) ($ground + 5) ($trunkW*0.55) 2)`"/>")
  }
  $tips = @()
  foreach ($l in $limbs) {
    $ex = $cx + $l[0]; $ey = $l[1]
    $qx = $forkX + ($ex - $forkX) * 0.2; $qy = $forkY + ($ey - $forkY) * 0.75
    [void]$wood.Append("<path d=`"$(Limb $forkX ($forkY + 6) $qx $qy $ex $ey ($trunkW*0.55) ($trunkW*0.16))`"/>")
    $tips += ,@($ex, $ey, 1.0)
    # One twig from the middle of the limb, pointing outwards and up
    $mx = 0.25*$forkX + 0.5*$qx + 0.25*$ex; $my = 0.25*$forkY + 0.5*$qy + 0.25*$ey
    $side = if ($l[0] -lt 0) { -1 } else { 1 }
    $tx = $mx + $side * (Rand 18 30); $ty = $my - (Rand 14 26)
    [void]$wood.Append("<path d=`"$(Limb $mx $my ($mx + $side*6) ($my - 10) $tx $ty ($trunkW*0.26) ($trunkW*0.08))`"/>")
    $tips += ,@($tx, $ty, 0.75)
  }
  [void]$sb.Append("<g fill=`"#5a3d2e`" filter=`"url(#brush)`">$($wood.ToString())</g>")
  # Light side of the trunk: a thin tapering strip following the trunk curve
  [void]$sb.Append("<path d=`"$(Limb ($cx - $trunkW*0.25) ($ground - 2) ($cx - 5 - $trunkW*0.25) (($ground + $forkY) / 2) ($forkX - $trunkW*0.2) ($forkY + 8) ($trunkW*0.22) ($trunkW*0.06))`" fill=`"#7d5a44`" opacity=`"0.55`" filter=`"url(#brush)`"/>")

  # Leaf clumps at every tip, plus a big one over the fork: the crown is dense and hides the limbs
  $tips += ,@($forkX, ($forkY - $clumpR*1.6), 1.15)
  $top = ($tips | ForEach-Object { $_[1] } | Measure-Object -Minimum).Minimum
  $span = [Math]::Max(1, $forkY - $top)
  $blobs = @()
  foreach ($tp in $tips) {
    $r = $clumpR * $tp[2]
    [void]$sb.Append("<ellipse cx=`"$(F $tp[0])`" cy=`"$(F $tp[1])`" rx=`"$(F ($r*0.92))`" ry=`"$(F ($r*0.78))`" fill=`"#2f6e35`" filter=`"url(#brush)`"/>")
    $low = ($tp[1] - $top) / $span  # 0 at the top of the crown, 1 at the fork
    for ($i = 0; $i -lt 46; $i++) {
      $ang = Rand 0 (2 * [Math]::PI); $rad = [Math]::Sqrt($rnd.NextDouble())
      $dx = [Math]::Cos($ang) * $rad; $dy = [Math]::Sin($ang) * $rad
      $t = $dx * 0.4 + $dy * 0.7 + $low * 0.7 - 0.25
      $idx = [Math]::Floor((($t + 1) / 2) * 5 + (Rand -0.8 0.8))
      $idx = [Math]::Max(0, [Math]::Min(4, $idx))
      $blobs += ,@(($tp[0] + $dx * $r), ($tp[1] + $dy * $r * 0.8), (Rand ($r*0.2) ($r*0.36)), $idx)
    }
  }
  [void]$sb.Append('<g filter="url(#brush)">')
  foreach ($bl in ($blobs | Sort-Object { -$_[3] })) {
    [void]$sb.Append("<ellipse cx=`"$(F $bl[0])`" cy=`"$(F $bl[1])`" rx=`"$(F $bl[2])`" ry=`"$(F ($bl[2]*0.8))`" fill=`"$($leafShades[$bl[3]])`"/>")
  }
  [void]$sb.Append('</g>')

  # Grass growing over the trunk base, so the tree stands in the meadow
  [void]$sb.Append('<g stroke-linecap="round">')
  for ($i = 0; $i -lt 40; $i++) {
    $gx = $cx + (Rand (-$trunkW*2.2) ($trunkW*2.2)); $gy = $ground + (Rand 1 7)
    $a = (Rand -120 -60) * [Math]::PI / 180; $gl = Rand 5 11
    [void]$sb.Append("<path d=`"M$(F $gx) $(F $gy) l$(F ([Math]::Cos($a)*$gl)) $(F ([Math]::Sin($a)*$gl))`" stroke=`"$(Pick @('#5d9b3c', '#6fae3f', '#86c34f', '#a9d24e'))`" stroke-width=`"2`"/>")
  }
  [void]$sb.Append('</g></svg>')
  Save $name $sb.ToString()
}


# Big round tree: limbs as @(x offset from the centre, y of the tip)
Tree 'tree-1.svg' 200 240 16 150 @(@(-62, 96), @(58, 90), @(-22, 58), @(26, 50)) 34
# Tall tree
Tree 'tree-2.svg' 150 260 13 170 @(@(-38, 118), @(36, 104), @(-8, 62), @(14, 80)) 28
# Small bushy tree
Tree 'tree-3.svg' 160 150 11 102 @(@(-46, 70), @(46, 66), @(2, 44)) 26
