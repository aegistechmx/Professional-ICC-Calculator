# TCC Digitization API Documentation

## Overview

The TCC (Time Current Characteristic) Digitization API provides functionality to extract curve data from PDF documents containing protection device characteristic curves. This enables automated analysis and coordination of protective devices in electrical systems.

## Features

- **Vector PDF Processing**: Extracts curves directly from vector-based PDF paths
- **Image PDF Processing**: Uses OpenCV.js for processing scanned or image-based PDFs
- **Automatic Axis Detection**: Identifies time and current axes automatically
- **Curve Filtering**: Filters out noise and irrelevant graphical elements
- **Multiple Output Formats**: Supports various curve data formats

## API Reference

### Core Functions

#### `procesarPaths(paths, viewport)`

Extracts curve points from vector PDF path data.

**Parameters:**
- `paths` (Array): Array of path commands from PDF parsing
- `viewport` (Object): PDF viewport information with width/height

**Returns:** `Array` of point objects `{x, y}` representing the curve

**Example:**
```javascript
const paths = [
  ['m', 100, 200, 'l', 150, 180, 'l', 200, 150]
];
const viewport = { width: 800, height: 600 };
const points = procesarPaths(paths, viewport);
// Returns: [{x: 100, y: 200}, {x: 150, y: 180}, {x: 200, y: 150}]
```

#### `procesarImagenOpenCV(canvas)`

Processes image-based PDFs using OpenCV.js for curve extraction.

**Parameters:**
- `canvas` (HTMLCanvasElement): Canvas containing the PDF page image

**Returns:** `Promise<Array>` of point objects `{x, y}` representing detected curves

**Requirements:** OpenCV.js must be loaded (`cv` global available)

**Example:**
```javascript
const canvas = document.getElementById('pdf-canvas');
const points = await procesarImagenOpenCV(canvas);
// Returns: [{x: 120, y: 180}, {x: 180, y: 150}, ...]
```

#### `detectarEjesAutomaticamente(puntos)`

Automatically detects time and current axes from curve data.

**Parameters:**
- `puntos` (Array): Array of curve points

**Returns:** `Object` with axis information:
```javascript
{
  ejeX: { min: 0, max: 100, escala: 'log' },
  ejeY: { min: 0, max: 1000, escala: 'log' },
  tipoEjeX: 'tiempo',
  tipoEjeY: 'corriente'
}
```

#### `filtrarContornoCurva(puntosContorno)`

Filters contours to identify valid TCC curves.

**Parameters:**
- `puntosContorno` (Array): Contour points from image processing

**Returns:** `Array` filtered curve points or empty array if invalid

**Filtering Criteria:**
- Minimum area threshold
- Curve shape validation
- Noise reduction

### Utility Functions

#### `samplearBezier(p0, p1, p2, p3, numSamples)`

Samples points along a Bézier curve.

**Parameters:**
- `p0` (Object): Start point `{x, y}`
- `p1` (Object): Control point 1
- `p2` (Object): Control point 2
- `p3` (Object): End point
- `numSamples` (Number): Number of sample points (default: 10)

**Returns:** `Array` of sampled points

#### `escalarPunto(punto, viewport, escala)`

Scales a point from PDF coordinates to normalized coordinates.

**Parameters:**
- `punto` (Object): Point to scale `{x, y}`
- `viewport` (Object): PDF viewport
- `escala` (Object): Scale factors `{x, y}`

**Returns:** `Object` scaled point

## Integration Examples

### Processing a Vector PDF

```javascript
// 1. Load PDF and extract paths
const pdf = await pdfjsLib.getDocument({ data: pdfData }).promise;
const page = await pdf.getPage(1);
const viewport = page.getViewport({ scale: 1.0 });

// Extract paths from PDF operators
const paths = await extractPathsFromPDF(page);

// 2. Process paths to get curve points
const curvePoints = procesarPaths(paths, viewport);

// 3. Detect axes
const axes = detectarEjesAutomaticamente(curvePoints);

// 4. Use curve data for coordination analysis
console.log('TCC Curve extracted:', curvePoints.length, 'points');
```

### Processing an Image PDF

```javascript
// 1. Render PDF page to canvas
const canvas = document.createElement('canvas');
const context = canvas.getContext('2d');
await page.render({ canvasContext: context, viewport }).promise;

// 2. Process with OpenCV
const curvePoints = await procesarImagenOpenCV(canvas);

// 3. Filter and validate curves
const validCurves = curvePoints.map(contour =>
  filtrarContornoCurva(contour)
).filter(curve => curve.length > 0);

// 4. Process valid curves
validCurves.forEach((curve, index) => {
  console.log(`Curve ${index}:`, curve.length, 'points');
});
```

## Error Handling

The API includes comprehensive error handling:

- **OpenCV Unavailable**: Falls back gracefully when OpenCV.js is not loaded
- **Invalid Paths**: Skips malformed path data
- **Empty Contours**: Filters out contours with insufficient data
- **Memory Management**: Properly cleans up OpenCV Mat objects

## Performance Considerations

- **Vector Processing**: Fast, suitable for vector PDFs
- **Image Processing**: Slower due to computer vision operations
- **Memory Usage**: OpenCV operations require careful memory cleanup
- **Batch Processing**: Process multiple pages sequentially to avoid memory issues

## Dependencies

- **pdfjsLib**: For PDF parsing and path extraction
- **OpenCV.js**: For image processing (optional, with fallback)
- **Math.js**: For advanced mathematical operations

## Browser Compatibility

- Modern browsers with ES6+ support
- WebAssembly support required for OpenCV.js
- Canvas 2D API for image processing

## Future Enhancements

- Machine learning-based curve classification
- Multi-curve separation in complex diagrams
- Automatic unit detection and conversion
- Integration with protection device databases