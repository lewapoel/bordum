import { UploadedFile, BitrixFile } from '@/models/bitrix/disk.ts';
import { fetchDiskApi } from '@/utils/bitrix24.ts';

export async function folderUploadFile(
  folderId: number,
  file: BitrixFile,
): Promise<UploadedFile | null> {
  try {
    const response = await fetchDiskApi('disk.folder.uploadfile', {
      id: folderId,
      data: {
        NAME: file[0],
      },
      fileContent: file[1],
      generateUniqueName: true,
    });

    const data = await response.json();
    if (response.ok) {
      const result = data['result'];

      return {
        id: result['ID'],
        downloadUrl: result['DOWNLOAD_URL'],
      };
    }

    return null;
  } catch (e) {
    console.error(e);
    alert('Nie udało się zapisać pliku w folderze. Szczegóły w konsoli');
    return null;
  }
}

export async function deleteFile(fileId: number): Promise<boolean> {
  try {
    const response = await fetchDiskApi('disk.file.delete', {
      id: fileId,
    });

    const data = await response.json();
    if (response.ok) {
      return data['result'];
    }

    return false;
  } catch (e) {
    console.error(e);
    alert('Nie udało się usunąć pliku. Szczegóły w konsoli');
    return false;
  }
}
