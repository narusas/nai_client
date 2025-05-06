import { ImageData } from '../entities';

export interface ImageRepository {
  saveImage(image: ImageData): Promise<void>;
  saveRepresentativeImage(cutId: string, imageUrl: string): Promise<void>;
}
