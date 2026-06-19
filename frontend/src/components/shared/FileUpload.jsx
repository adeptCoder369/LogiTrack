  import { useState, useRef } from 'react';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Capacitor } from '@capacitor/core';
import { UploadCloud, X, FileText, Camera as CameraIcon, Image, Plus, Trash2 } from 'lucide-react';
import { uploadFile, getFileUrl } from '../../lib/api';
import { toast } from 'sonner';

function isNativePlatform() {
  return typeof window !== 'undefined' && !!window.Capacitor?.isNativePlatform?.();
}

function base64ToBlob(base64, type) {
  const binary = atob(base64);
  const array = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    array[i] = binary.charCodeAt(i);
  }
  return new Blob([array], { type });
}

async function captureCameraFile() {
  const photo = await Camera.getPhoto({
    quality: 85,
    allowEditing: false,
    correctOrientation: true,
    source: CameraSource.Camera,
    resultType: CameraResultType.Base64,
    saveToGallery: false,
  });

  if (!photo.base64String) {
    throw new Error('Camera did not return image data');
  }

  const format = photo.format || 'jpeg';
  const type = format === 'jpg' ? 'image/jpeg' : `image/${format}`;
  const blob = base64ToBlob(photo.base64String, type);

  return new File([blob], `logitrack-camera-${Date.now()}.${format}`, { type });
}

export const FileUpload = ({ 
  value, 
  onChange, 
  label = 'Upload File', 
  accept = '*',
  showCameraOption = true 
}) => {
  const [uploading, setUploading] = useState(false);
  const [originalName, setOriginalName] = useState('');
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const result = await uploadFile(file);
      onChange(result.file_id);
      setOriginalName(result.original_name || file.name);
      toast.success(`${file.name} uploaded successfully`);
    } catch (error) {
      toast.error('Failed to upload file');
      console.error('Upload error:', error);
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = () => {
    onChange(null);
    setOriginalName('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    if (cameraInputRef.current) {
      cameraInputRef.current.value = '';
    }
  };

  const openFileSelector = () => {
    fileInputRef.current?.click();
  };

  const openCamera = async () => {
    if (isNativePlatform()) {
      try {
        const file = await captureCameraFile();
        const event = { target: { files: [file] } };
        await handleFileChange(event);
        return;
      } catch (error) {
        toast.error(error.message || 'Failed to capture photo');
        return;
      }
    }

    cameraInputRef.current?.click();
  };

  // Check if accept includes image types
  const isImageUpload = accept.includes('image') || accept === '*';
  
  // Extract display name from file_id (format: prefix_originalname.ext)
  const displayName = originalName || (value ? value.split('_').slice(1).join('_') || value : '');

  return (
    <div className="space-y-2">
      {label && <label className="text-sm font-medium text-gray-700">{label}</label>}
      
      {value ? (
        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
          {isImageUpload ? (
            <img 
              src={getFileUrl(value)} 
              alt="Uploaded" 
              className="w-10 h-10 rounded object-cover"
            />
          ) : (
            <FileText className="w-5 h-5 text-blue-500" />
          )}
          <a
            href={getFileUrl(value)}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-blue-600 hover:underline flex-1 truncate"
            title={displayName}
          >
            {displayName}
          </a>
          <button
            type="button"
            onClick={handleRemove}
            className="p-1 hover:bg-gray-200 rounded"
            data-testid="remove-file-btn"
          >
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Hidden file inputs */}
          <input
            ref={fileInputRef}
            type="file"
            accept={accept}
            onChange={handleFileChange}
            className="hidden"
            data-testid="file-input"
          />
          
          {/* Camera input - uses device camera on mobile */}
          {isImageUpload && showCameraOption && (
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFileChange}
              className="hidden"
              data-testid="camera-input"
            />
          )}

          {uploading ? (
            <div className="dropzone">
              <div className="flex flex-col items-center gap-2">
                <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                <span className="text-sm text-gray-500">Uploading...</span>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {/* Main upload area */}
              <div
                className="dropzone cursor-pointer"
                onClick={openFileSelector}
                data-testid="file-dropzone"
              >
                <div className="flex flex-col items-center gap-2">
                  <UploadCloud className="w-10 h-10 text-gray-400" />
                  <span className="text-sm text-gray-500">Click to upload or drag and drop</span>
                </div>
              </div>

              {/* Camera capture button - only for image uploads */}
              {isImageUpload && showCameraOption && (
                <button
                  type="button"
                  onClick={openCamera}
                  className="flex items-center justify-center gap-2 w-full py-3 px-4 border-2 border-dashed border-blue-300 rounded-lg bg-blue-50 hover:bg-blue-100 hover:border-blue-400 transition-colors"
                  data-testid="camera-capture-btn"
                >
                  <CameraIcon className="w-5 h-5 text-blue-600" />
                  <span className="text-sm font-medium text-blue-600">Take Photo with Camera</span>
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Multi-photo upload component for trucks (up to 5 photos)
export const MultiPhotoUpload = ({ 
  value = [], 
  onChange, 
  label = 'Upload Photos',
  maxPhotos = 5 
}) => {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  // Ensure value is always an array
  const photos = Array.isArray(value) ? value : (value ? [value] : []);

  const handleFileChange = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    // Check if we can add more photos
    const remainingSlots = maxPhotos - photos.length;
    if (remainingSlots <= 0) {
      toast.error(`Maximum ${maxPhotos} photos allowed`);
      return;
    }

    const filesToUpload = files.slice(0, remainingSlots);
    
    setUploading(true);
    try {
      const uploadPromises = filesToUpload.map(async (file) => {
        const result = await uploadFile(file);
        return {
          file_id: result.file_id,
          original_name: result.original_name || file.name
        };
      });
      
      const uploadedPhotos = await Promise.all(uploadPromises);
      const newPhotos = [...photos, ...uploadedPhotos];
      onChange(newPhotos);
      
      toast.success(`${uploadedPhotos.length} photo(s) uploaded successfully`);
    } catch (error) {
      toast.error('Failed to upload photos');
      console.error('Upload error:', error);
    } finally {
      setUploading(false);
      // Reset input
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (cameraInputRef.current) cameraInputRef.current.value = '';
    }
  };

  const handleRemove = (index) => {
    const newPhotos = photos.filter((_, i) => i !== index);
    onChange(newPhotos);
  };

  const openFileSelector = () => {
    fileInputRef.current?.click();
  };

  const openCamera = async () => {
    if (isNativePlatform()) {
      try {
        const file = await captureCameraFile();
        const event = { target: { files: [file] } };
        await handleFileChange(event);
        return;
      } catch (error) {
        toast.error(error.message || 'Failed to capture photo');
        return;
      }
    }

    cameraInputRef.current?.click();
  };

  const canAddMore = photos.length < maxPhotos;

  return (
    <div className="space-y-3">
      {label && (
        <label className="text-sm font-medium text-gray-700 flex items-center justify-between">
          <span>{label}</span>
          <span className="text-xs text-gray-500 font-normal">
            {photos.length}/{maxPhotos} photos
          </span>
        </label>
      )}
      
      {/* Existing photos grid */}
      {photos.length > 0 && (
        <div className="grid grid-cols-5 gap-2">
          {photos.map((photo, index) => {
            const fileId = typeof photo === 'string' ? photo : photo.file_id;
            const displayName = typeof photo === 'string' 
              ? photo.split('_').slice(1).join('_') || photo 
              : photo.original_name;
            
            return (
              <div 
                key={index} 
                className="relative group aspect-square bg-gray-100 rounded-lg overflow-hidden border"
              >
                <img 
                  src={getFileUrl(fileId)} 
                  alt={displayName}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleRemove(index)}
                    className="p-1.5 bg-red-500 hover:bg-red-600 rounded-full"
                  >
                    <Trash2 className="w-4 h-4 text-white" />
                  </button>
                  <span className="text-[10px] text-white text-center px-1 truncate max-w-full">
                    {displayName}
                  </span>
                </div>
                <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-1 py-0.5">
                  <p className="text-[9px] text-white truncate text-center">{index + 1}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Hidden file inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleFileChange}
        className="hidden"
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Upload buttons */}
      {canAddMore && (
        <div className="space-y-2">
          {uploading ? (
            <div className="flex items-center justify-center gap-2 p-4 bg-gray-50 rounded-lg border-2 border-dashed">
              <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-sm text-gray-500">Uploading...</span>
            </div>
          ) : (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={openFileSelector}
                className="flex-1 flex items-center justify-center gap-2 py-3 px-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-colors"
              >
                <Plus className="w-5 h-5 text-gray-500" />
                <span className="text-sm text-gray-600">Add Photos</span>
              </button>
              <button
                type="button"
                onClick={openCamera}
                className="flex items-center justify-center gap-2 py-3 px-4 border-2 border-dashed border-blue-300 rounded-lg bg-blue-50 hover:bg-blue-100 hover:border-blue-400 transition-colors"
              >
                <CameraIcon className="w-5 h-5 text-blue-600" />
                <span className="text-sm font-medium text-blue-600">Camera</span>
              </button>
            </div>
          )}
          <p className="text-xs text-gray-500 text-center">
            You can add up to {maxPhotos - photos.length} more photo(s)
          </p>
        </div>
      )}
    </div>
  );
};

// Simplified photo upload component specifically for photos with camera
export const PhotoUpload = ({ 
  value, 
  onChange, 
  label = 'Upload Photo'
}) => {
  return (
    <FileUpload
      value={value}
      onChange={onChange}
      label={label}
      accept="image/*"
      showCameraOption={true}
    />
  );
};
