[CmdletBinding()]
param(
  [ValidateSet("deepseek-v4-flash", "deepseek-v4-pro")]
  [string]$Model = "deepseek-v4-flash"
)

$secureKey = Read-Host "Enter a new DeepSeek API key (not written to files or command history)" -AsSecureString
$bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secureKey)

try {
  $env:DEEPSEEK_API_KEY = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr)
  $env:DEEPSEEK_MODEL = $Model
  docker compose up -d --no-build --force-recreate api career-navigation
  docker compose ps
}
finally {
  if ($bstr -ne [IntPtr]::Zero) { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr) }
  Remove-Item Env:DEEPSEEK_API_KEY -ErrorAction SilentlyContinue
  Remove-Item Env:DEEPSEEK_MODEL -ErrorAction SilentlyContinue
}
