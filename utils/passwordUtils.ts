export function passwordCheck(senha: string): string[] {
    const errorMessage: string[] = []
    if (senha.length < 8) {
      errorMessage.push("Erro! senha deve possuir, no mínimo, 8 caracteres")
    }

    let lower = false
    let upper = false
    let numbers = false
    let simbols = false

    for (const letra of senha) {
      if ((/[a-z]/).test(letra)) {
        lower = true
      }
      else if ((/[A-Z]/).test(letra)) {
        upper = true
      }
      else if ((/[0-9]/).test(letra)) {
        numbers = true
      } else {
        simbols = true
      }
    }
    if (!lower) {
      errorMessage.push("Erro! senha deve possuir letra(s) minúscula(s)")
    }
    if (!upper) {
      errorMessage.push("Erro! senha deve possuir letra(s) maiúscula(s)")
    }
    if (!numbers) {
      errorMessage.push("Erro! senha deve possuir número(s)")
    }
    if (!simbols) {
      errorMessage.push("Erro! senha deve possuir símbolo(s)")
    }
    return errorMessage
  }

/**
 * Gera uma senha padrão para novos usuários
 * A senha gerada será baseada no email do usuário e terá pelo menos 8 caracteres
 * @param email Email do usuário
 * @returns Uma senha padrão segura para usuários recém-criados
 */
export function generateDefaultPassword(email: string): string {
  // Pega a parte do email antes do @
  const userPart = email.split('@')[0];
  
  // Adiciona um timestamp como sufixo para garantir unicidade e complexidade
  const timestamp = new Date().getTime().toString().substring(6, 10);
  
  // Combina com caracteres especiais para garantir os requisitos de segurança
  const defaultPassword = `${userPart}_${timestamp}!Esc`;
  
  return defaultPassword;
}