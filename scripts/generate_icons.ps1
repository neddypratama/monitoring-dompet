Add-Type -AssemblyName System.Drawing

function Generate-AppIcon($size, $outputPath) {
    $bmp = New-Object System.Drawing.Bitmap($size, $size)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit

    # Indigo to Cyan Gradient
    $rect = New-Object System.Drawing.Rectangle(0, 0, $size, $size)
    $c1 = [System.Drawing.Color]::FromArgb(255, 79, 70, 229)  # #4F46E5
    $c2 = [System.Drawing.Color]::FromArgb(255, 6, 182, 212)  # #06B6D4
    $brush = New-Object System.Drawing.Drawing2D.LinearGradientBrush($rect, $c1, $c2, 45.0)
    $g.FillRectangle($brush, $rect)

    # Draw Inner Wallet Graphic
    $scale = $size / 512.0
    $bodyRect = New-Object System.Drawing.RectangleF(
        (100.0 * $scale), (150.0 * $scale), (312.0 * $scale), (230.0 * $scale)
    )
    $corner = 36.0 * $scale
    $path = New-Object System.Drawing.Drawing2D.GraphicsPath
    $path.AddArc($bodyRect.X, $bodyRect.Y, $corner, $corner, 180, 90)
    $path.AddArc($bodyRect.Right - $corner, $bodyRect.Y, $corner, $corner, 270, 90)
    $path.AddArc($bodyRect.Right - $corner, $bodyRect.Bottom - $corner, $corner, $corner, 0, 90)
    $path.AddArc($bodyRect.X, $bodyRect.Bottom - $corner, $corner, $corner, 90, 90)
    $path.CloseFigure()

    $walletBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)
    $g.FillPath($walletBrush, $path)

    # Flap
    $flapRect = New-Object System.Drawing.RectangleF(
        (260.0 * $scale), (230.0 * $scale), (152.0 * $scale), (90.0 * $scale)
    )
    $flapPath = New-Object System.Drawing.Drawing2D.GraphicsPath
    $flapCorner = 28.0 * $scale
    $flapPath.AddArc($flapRect.X, $flapRect.Y, $flapCorner, $flapCorner, 180, 90)
    $flapPath.AddArc($flapRect.Right - $flapCorner, $flapRect.Y, $flapCorner, $flapCorner, 270, 90)
    $flapPath.AddArc($flapRect.Right - $flapCorner, $flapRect.Bottom - $flapCorner, $flapCorner, $flapCorner, 0, 90)
    $flapPath.AddArc($flapRect.X, $flapRect.Bottom - $flapCorner, $flapCorner, $flapCorner, 90, 90)
    $flapPath.CloseFigure()

    $flapBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 238, 242, 255))
    $g.FillPath($flapBrush, $flapPath)

    # Lock dot
    $dotBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 79, 70, 229))
    $dotSize = 22.0 * $scale
    $g.FillEllipse($dotBrush, (320.0 * $scale), (264.0 * $scale), $dotSize, $dotSize)

    $parentDir = Split-Path -Parent $outputPath
    if (-not (Test-Path $parentDir)) {
        New-Item -ItemType Directory -Path $parentDir -Force | Out-Null
    }
    $bmp.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $g.Dispose()
    $bmp.Dispose()
}

# Web PWA Icons
Generate-AppIcon 192 "c:\laragon\www\monitoring-dompet\frontend\public\icon-192.png"
Generate-AppIcon 512 "c:\laragon\www\monitoring-dompet\frontend\public\icon-512.png"

# Copy to dist
if (Test-Path "c:\laragon\www\monitoring-dompet\dist") {
    Copy-Item "c:\laragon\www\monitoring-dompet\frontend\public\icon-192.png" "c:\laragon\www\monitoring-dompet\dist\icon-192.png" -Force
    Copy-Item "c:\laragon\www\monitoring-dompet\frontend\public\icon-512.png" "c:\laragon\www\monitoring-dompet\dist\icon-512.png" -Force
    Copy-Item "c:\laragon\www\monitoring-dompet\frontend\public\manifest.json" "c:\laragon\www\monitoring-dompet\dist\manifest.json" -Force
}

# Android Native Mipmap Icons
$resDir = "c:\laragon\www\monitoring-dompet\frontend\android\app\src\main\res"
if (Test-Path $resDir) {
    $mipmaps = @{
        "mipmap-mdpi" = 48
        "mipmap-hdpi" = 72
        "mipmap-xhdpi" = 96
        "mipmap-xxhdpi" = 144
        "mipmap-xxxhdpi" = 192
    }
    foreach ($m in $mipmaps.Keys) {
        $s = $mipmaps[$m]
        Generate-AppIcon $s "$resDir\$m\ic_launcher.png"
        Generate-AppIcon $s "$resDir\$m\ic_launcher_round.png"
        Generate-AppIcon $s "$resDir\$m\ic_launcher_foreground.png"
    }
}
