[CmdletBinding()]
param(
  [ValidateSet("deepseek-v4-flash", "deepseek-v4-pro")]
  [string]$Model = "deepseek-v4-flash"
)

$secureKey = Read-Host "输入新的 DeepSeek API Key（不会写入文件）" -AsSecureString
$bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secureKey)

try {
  $env:DEEPSEEK_API_KEY = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr)
  $env:DEEPSEEK_MODEL = $Model
  npm run dev:api
}
finally {
  if ($bstr -ne [IntPtr]::Zero) { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr) }
  Remove-Item Env:DEEPSEEK_API_KEY -ErrorAction SilentlyContinue
}
