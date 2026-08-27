# Folder Model ONNX (Opsional)

Letakkan file model YOLOv8 hasil training dataset Anda di folder ini dengan nama:
`plate_detector.onnx`

Jika file tersebut ada, aplikasi ALPR Vision akan otomatis menggunakan model neural network tersebut untuk mendeteksi koordinat plat nomor dengan presisi tinggi melalui WebAssembly/WebGL di browser!

Jika tidak ada, sistem akan otomatis menggunakan algoritma Computer Vision Contour & Sobel filter bawaan tanpa konfigurasi tambahan.
