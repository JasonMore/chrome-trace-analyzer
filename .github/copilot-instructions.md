# Chrome Performance Trace Analysis Agent

This directory is dedicated to analyzing performance traces from Google Chrome DevTools Profiler.

## Purpose

This workspace is used for examining and optimizing web application performance through Chrome's performance profiling data.

## Environment Context

**IMPORTANT**: These traces are captured from a **development Ruby environment running in a GitHub Codespace**, not production.

### Development Environment Characteristics

- Rails development server with asset pipeline
- Webpack with `NODE_ENV=production` (enabled via `NODE_ENV=production script/server`)
- Development database (SQLite with verbose logging)
- Hot reloading infrastructure
- Source maps and debugging instrumentation
- Codespace network latency

### Running the Test Environment

For best performance testing results, always start the server with Webpack in production mode:

```bash
NODE_ENV=production script/server
```

This enables:

- Webpack production optimizations (minification, tree-shaking)
- Better baseline for performance comparison
- More representative metrics while still in dev environment
- Reduced compilation overhead during trace capture

### Expected Performance Baselines (Development)

- Core Web Vitals (FCP/LCP) will be **extremely high** (60+ seconds) due to dev overhead - **this is normal**
- Long blocking tasks (5+ seconds) from webpack compilation and source map generation - **expected**
- High JavaScript execution times include development middleware and debugging - **typical**

### Interpreting Results

- **Focus on relative improvements** between implementations, not absolute values
- Development improvements of 10-20% typically translate to **20-30% gains in production**
- Statistical significance requires multiple runs (minimum 3 per variant)
- Use mean, median, and standard deviation for proper comparison

## What Chrome Performance Traces Contain

- JavaScript execution timings
- Rendering and painting metrics
- Network activity
- Memory usage patterns
- Frame rates and jank detection
- Call stacks and flame graphs
- Core Web Vitals (FCP, LCP, CLS, FID, TBT)
- Long tasks and main thread blocking
- Garbage collection events
- Compilation overhead

## Analysis Tools Available

### `analyzer.js` (Primary Tool)

Comprehensive performance analysis tool providing:

- Core Web Vitals extraction (FCP, LCP, CLS, FID, TBT)
- Statistical analysis (mean, median, standard deviation)
- JavaScript execution breakdown with compilation and GC time
- Memory usage patterns
- Rendering performance (layout, paint, forced reflows)
- Comparative analysis between implementations
- Prioritized recommendations

**Usage**:

```bash
node analyzer.js <directory-or-file>
node analyzer.js --format=json <directory>
node analyzer.js --threshold=100 <directory>
```

**Output**: Statistical comparison with μ (mean), σ (standard deviation), and median values for all key metrics.

## Common Analysis Tasks

- Comparing performance between implementations (A/B testing)
- Identifying performance bottlenecks in JavaScript execution
- Analyzing long tasks and main thread blocking (>50ms threshold)
- Examining layout thrashing and forced reflows
- Detecting memory pressure and GC impact
- Measuring Total Blocking Time (TBT) impact
- Reviewing compilation overhead

## Performance Optimization Priorities

### For Development Environment

1. Webpack code-splitting and persistent caching
2. Rails asset pipeline optimization (`config.assets.debug = false`)
3. Babel-loader caching
4. Reduced development logging
5. Database query optimization

### For Production Deployment

1. Break up long tasks (>50ms) using time-slicing or yielding
2. Code splitting and lazy loading
3. Optimize JavaScript execution paths
4. Reduce forced reflows
5. Improve resource loading and critical path

## File Naming Convention

Use clear variant identifiers in filenames for proper comparison:

- `Trace-<timestamp>-<variant>-run<number>.json`
- Example: `Trace-20251104T153222-indexeddb-run1.json`
- Example: `Trace-20251104T153643-original-run1.json`

## Test Methodology Best Practices

1. **Multiple Runs**: Minimum 3 runs per implementation for statistical validity
2. **CPU Throttling**: Use 4x throttling to simulate mid-tier devices
3. **Consistent Actions**: Perform identical user interactions for each trace
4. **Environment**: Document development vs production context
5. **Clear Variants**: Use descriptive names for A/B comparison

## File Types

Traces are typically exported as:

- `.json` files from Chrome DevTools Performance panel
- Can be large files (10MB-100MB+)
- Contain thousands to millions of trace events

## How to Capture Traces

1. Open Chrome DevTools (F12)
2. Go to Performance tab
3. Enable CPU throttling (4x recommended)
4. Click Record
5. Perform actions to profile
6. Stop recording
7. Export trace via Save Profile
8. Name file with variant and run number

## Key Metrics to Monitor

### JavaScript Performance

- **Total Execution Time**: Time spent running JavaScript
- **Compilation Time**: Time spent parsing/compiling JS
- **GC Time**: Garbage collection overhead
- **Long Tasks**: Tasks >50ms that block the main thread

### Core Web Vitals

- **FCP** (First Contentful Paint): <1.8s good (in production)
- **LCP** (Largest Contentful Paint): <2.5s good (in production)
- **CLS** (Cumulative Layout Shift): <0.1 good
- **FID** (First Input Delay): <100ms good (in production)
- **TBT** (Total Blocking Time): <200ms good (in production)

### Rendering

- **Layout Time**: Time spent calculating positions
- **Paint Time**: Time spent rendering pixels
- **Forced Reflows**: Synchronous layout recalculations (avoid)

## Assistant Capabilities

When analyzing traces in this directory, I can help:

- Parse and interpret trace data with context awareness
- Compare implementations statistically
- Identify performance issues and bottlenecks
- Suggest optimization strategies appropriate for dev vs production
- Explain Chrome profiler metrics
- Generate PR-ready performance reports with:
  - Performance improvement summary tables
  - Statistical analysis with confidence
  - Expected production impact projections
  - Key findings and actionable recommendations
- Calculate relative improvements between variants
- Provide actionable recommendations based on environment
- Answer questions like:
  - "Analyze the traces and explain the performance differences"
  - "What are the key performance bottlenecks?"
  - "Generate a PR description with the performance analysis"
  - "Compare the statistical significance of these results"
  - "What optimizations should I prioritize?"

## Common Workflows

### Performance Testing Workflow

1. Start server: `NODE_ENV=production script/server`
2. Capture 3+ traces per variant (with CPU throttling 4x)
3. Name files: `Trace-<timestamp>-<variant>-run<number>.json`
4. Run analysis: `node analyzer.js ./trace-directory`
5. Ask Copilot: "run the report and give me a nice analysis I can put into a PR description"
6. Review statistical significance and relative improvements

### Understanding Statistical Output

- **μ (mu)**: Mean/average - primary comparison metric
- **σ (sigma)**: Standard deviation - consistency indicator (lower is more consistent)
- **median**: Middle value - robust to outliers
- **Improvement %**: Focus on this for relative performance gains

Development improvements translate to production:

- 10-15% dev improvement → 20-30% production gain (typical)
- 5-10% dev improvement → 10-20% production gain (moderate)
- <5% dev improvement → May not be significant in production
