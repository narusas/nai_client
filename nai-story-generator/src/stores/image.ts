import { defineStore } from 'pinia';

interface GalleryImage {
  id: string;
  url: string;
  scenarioName: string;
  cutIndex: number;
  createdAt: string;
  filePath?: string;
}

export const useImageStore = defineStore('image', {
  state: () => ({
    galleryImages: [] as GalleryImage[]
  }),
  
  actions: {
    saveImageToGallery(image: Omit<GalleryImage, 'id'>) {
      const id = `image-${Date.now()}`;
      
      this.galleryImages.push({
        ...image,
        id
      });
      
      this.saveToLocalStorage();
    },
    
    getGalleryImages(): GalleryImage[] {
      this.loadFromLocalStorage();
      return this.galleryImages;
    },
    
    removeFromGallery(id: string) {
      const index = this.galleryImages.findIndex(img => img.id === id);
      if (index >= 0) {
        this.galleryImages.splice(index, 1);
        this.saveToLocalStorage();
      }
    },
    
    saveToLocalStorage() {
      localStorage.setItem('nai-gallery-images', JSON.stringify(this.galleryImages));
    },
    
    loadFromLocalStorage() {
      const savedImages = localStorage.getItem('nai-gallery-images');
      if (savedImages) {
        try {
          this.galleryImages = JSON.parse(savedImages);
        } catch (e) {
          console.error('갤러리 이미지를 불러오는 중 오류 발생:', e);
        }
      }
    }
  }
});
