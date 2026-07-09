using System;
using System.Drawing;
using System.Drawing.Imaging;
using System.IO;

namespace CafeClient
{
    public class ScreenCapture
    {
        public static byte[] CaptureScreen(int quality = 80)
        {
            var screenWidth = System.Windows.Forms.Screen.PrimaryScreen.Bounds.Width;
            var screenHeight = System.Windows.Forms.Screen.PrimaryScreen.Bounds.Height;

            using (var bitmap = new Bitmap(screenWidth, screenHeight, PixelFormat.Format24bppRgb))
            {
                using (var graphics = Graphics.FromImage(bitmap))
                {
                    graphics.CopyFromScreen(0, 0, 0, 0, new Size(screenWidth, screenHeight), CopyPixelOperation.SourceCopy);
                }

                using (var memoryStream = new MemoryStream())
                {
                    var encoderParams = new EncoderParameters(1);
                    encoderParams.Param[0] = new EncoderParameter(Encoder.Quality, (long)quality);
                    
                    var jpegEncoder = GetEncoder(ImageFormat.Jpeg);
                    bitmap.Save(memoryStream, jpegEncoder, encoderParams);
                    
                    return memoryStream.ToArray();
                }
            }
        }

        public static string CaptureScreenAsBase64(int quality = 50)
        {
            var bytes = CaptureScreen(quality);
            return Convert.ToBase64String(bytes);
        }

        public static byte[] CaptureThumbnail(int width = 320, int height = 180, int quality = 50)
        {
            var screenWidth = System.Windows.Forms.Screen.PrimaryScreen.Bounds.Width;
            var screenHeight = System.Windows.Forms.Screen.PrimaryScreen.Bounds.Height;

            using (var fullBitmap = new Bitmap(screenWidth, screenHeight, PixelFormat.Format24bppRgb))
            {
                using (var fullGraphics = Graphics.FromImage(fullBitmap))
                {
                    fullGraphics.CopyFromScreen(0, 0, 0, 0, new Size(screenWidth, screenHeight), CopyPixelOperation.SourceCopy);
                }

                using (var thumbnail = new Bitmap(width, height))
                {
                    using (var thumbGraphics = Graphics.FromImage(thumbnail))
                    {
                        thumbGraphics.InterpolationMode = System.Drawing.Drawing2D.InterpolationMode.HighQualityBicubic;
                        thumbGraphics.DrawImage(fullBitmap, 0, 0, width, height);
                    }

                    using (var memoryStream = new MemoryStream())
                    {
                        var encoderParams = new EncoderParameters(1);
                        encoderParams.Param[0] = new EncoderParameter(Encoder.Quality, (long)quality);
                        
                        var jpegEncoder = GetEncoder(ImageFormat.Jpeg);
                        thumbnail.Save(memoryStream, jpegEncoder, encoderParams);
                        
                        return memoryStream.ToArray();
                    }
                }
            }
        }

        public static string CaptureThumbnailAsBase64(int width = 320, int height = 180, int quality = 50)
        {
            var bytes = CaptureThumbnail(width, height, quality);
            return Convert.ToBase64String(bytes);
        }

        private static ImageCodecInfo GetEncoder(ImageFormat format)
        {
            var codecs = ImageCodecInfo.GetImageDecoders();
            foreach (var codec in codecs)
            {
                if (codec.FormatID == format.Guid)
                {
                    return codec;
                }
            }
            throw new NotSupportedException("Encoder not found");
        }
    }
}
