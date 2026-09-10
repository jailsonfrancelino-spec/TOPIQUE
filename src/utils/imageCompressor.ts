/**
 * Utilitário para compactação e processamento de comprovantes de despesas
 * Reduz fotos de alta resolução tiradas no celular para tamanhos leves (80kb - 250kb)
 * mantendo textos e números de comprovantes e cupons fiscais perfeitamente legíveis.
 */

export async function compressReceiptImage(file: File, maxDimension = 1000, quality = 0.68): Promise<string> {
  return new Promise((resolve, reject) => {
    // Validação básica do tipo de arquivo
    if (!file.type.startsWith('image/')) {
      reject(new Error('O arquivo selecionado não é uma imagem válida.'));
      return;
    }

    const reader = new FileReader();

    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // Redimensionamento proporcional se exceder a dimensão máxima
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Não foi possível inicializar o renderizador de imagem.'));
          return;
        }

        // Fundo branco para garantir transparências sem artefatos pretos em JPG
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);

        // Desenhar a imagem redimensionada com interpolação suave
        ctx.drawImage(img, 0, 0, width, height);

        // Exporta como JPEG otimizado
        const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(compressedDataUrl);
      };

      img.onerror = () => {
        reject(new Error('Falha ao decodificar a foto do comprovante.'));
      };

      img.src = event.target?.result as string;
    };

    reader.onerror = () => {
      reject(new Error('Falha ao ler o arquivo de imagem.'));
    };

    reader.readAsDataURL(file);
  });
}
