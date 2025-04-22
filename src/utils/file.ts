export function downloadBase64File(
  fileName: string,
  fileType: string,
  base64Data: string,
) {
  const link = document.createElement('a');
  link.href = `data:application/${fileType};base64,${base64Data}`;
  link.download = fileName;

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
