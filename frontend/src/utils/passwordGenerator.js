export function generatePassword() {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  const num1 = Math.floor(1000 + Math.random() * 9000)
  const l1 = letters[Math.floor(Math.random() * 26)]
  const l2 = letters[Math.floor(Math.random() * 26)]
  return `BMG-${num1}-${l1}${l2}`
}
