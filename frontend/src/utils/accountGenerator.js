export function generateAccountNumber() {
  const num = Math.floor(1000000000 + Math.random() * 9000000000)
  return num.toString()
}
