const acceptedTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);
const maxInputBytes = 5 * 1024 * 1024;
const maxOutputBytes = 60 * 1024;

export async function prepareProfilePhoto(file) {
  if (!acceptedTypes.has(file.type)) throw new Error('Choisissez une photo JPG, PNG ou WebP.');
  if (!file.size || file.size > maxInputBytes) throw new Error('La photo doit faire au maximum 5 Mo.');
  const url = URL.createObjectURL(file);
  try {
    const image = await new Promise((resolve, reject) => {
      const element = new Image();
      element.onload = () => resolve(element);
      element.onerror = () => reject(new Error('Cette image est illisible. Essayez une autre photo.'));
      element.src = url;
    });
    if (!image.naturalWidth || !image.naturalHeight || image.naturalWidth * image.naturalHeight > 40000000) throw new Error('La résolution de cette image est trop élevée. Choisissez une photo plus petite.');
    const canvas = document.createElement('canvas');
    canvas.width = 320; canvas.height = 320;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Votre navigateur ne permet pas de préparer la photo.');
    const side = Math.min(image.naturalWidth, image.naturalHeight);
    context.fillStyle = '#ffffff'; context.fillRect(0, 0, 320, 320);
    context.drawImage(image, (image.naturalWidth - side) / 2, (image.naturalHeight - side) / 2, side, side, 0, 0, 320, 320);
    for (const quality of [0.85, 0.7, 0.55]) {
      const result = canvas.toDataURL('image/jpeg', quality);
      if (result.startsWith('data:image/jpeg;base64,') && Math.ceil((result.length - 23) * 3 / 4) <= maxOutputBytes) return result;
    }
    throw new Error('La photo reste trop volumineuse. Essayez une image plus simple.');
  } finally { URL.revokeObjectURL(url); }
}
