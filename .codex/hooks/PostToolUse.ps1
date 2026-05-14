param($file)

if ($file -match "\.js$") {
  node --check $file
}