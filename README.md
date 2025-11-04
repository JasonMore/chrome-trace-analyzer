# Chrome Performance Trace Analysis Tool

Analyze Chrome DevTools performance traces with statistical rigor and AI-powered insights.

## Overview

This workspace provides a tool to analyze Chrome performance traces, compare implementations, and generate PR-ready performance reports. It's optimized for A/B testing performance improvements in development environments.

## The Tool

### 🚀 analyzer.js

A comprehensive performance analysis tool with statistical rigor and Core Web Vitals extraction.

**Features:**
- Core Web Vitals (FCP, LCP, CLS, FID, TBT)
- Statistical analysis (mean, median, standard deviation)
- JavaScript execution breakdown (compilation, GC time)
- Memory usage patterns
- Rendering performance (layout, paint, forced reflows)
- Comparative analysis between variants
- Actionable recommendations

**Usage:**
```bash
# Analyze all traces in a directory
node analyzer.js indexeddb-perf-nov-4

# Analyze a single trace file
node analyzer.js path/to/trace.json

# Export to JSON
node analyzer.js --format=json indexeddb-perf-nov-4

# Custom long task threshold
node analyzer.js --threshold=100 indexeddb-perf-nov-4
```

## Quick Start

### 0. Start Your Server with Optimized Webpack

**Important**: For more accurate performance measurements, run your server with Webpack in production mode:

```bash
NODE_ENV=production script/server
```

This enables:
- Webpack production optimizations (minification, tree-shaking)
- Better baseline for performance testing
- More representative metrics (though still in dev environment)
- Reduced compilation overhead

### 1. Capture Performance Traces

1. Open Chrome DevTools (F12)
2. Go to **Performance** tab
3. Enable **CPU throttling: 4x slowdown**
4. Click **Record** (●)
5. Perform your test scenario
6. Click **Stop**
7. Click **Save Profile**

### 2. Organize Your Traces

Follow this naming convention for automatic comparison:

```
traces/
├── your-feature-name/
│   ├── Trace-20251104T153222-variant1-run1.json
│   ├── Trace-20251104T153249-variant1-run2.json
│   ├── Trace-20251104T153316-variant1-run3.json
│   ├── Trace-20251104T153643-variant2-run1.json
│   ├── Trace-20251104T153714-variant2-run2.json
│   └── Trace-20251104T153748-variant2-run3.json
```

**Naming Format:** `Trace-<timestamp>-<variant>-run<number>.json`

### 3. Run Analysis

```bash
node analyzer.js your-feature-name/
```

### 4. Get AI Insights with GitHub Copilot

This workspace is configured with custom Copilot instructions for intelligent analysis.

**Ask Copilot:**
- "Analyze the traces and explain the performance differences"
- "What are the key performance bottlenecks?"
- "Generate a PR description with the performance analysis"
- "Compare the statistical significance of these results"
- "What optimizations should I prioritize?"

**Copilot Understands:**
- Development environment context (Codespaces, Rails, etc.)
- Statistical analysis principles
- Performance optimization strategies
- How to interpret metrics in dev vs production

## Test Methodology

### Best Practices

1. **Run Multiple Tests**: Minimum 3 runs per variant for statistical validity
2. **Use CPU Throttling**: 4x throttling simulates mid-tier devices
3. **Consistent Actions**: Perform identical interactions for each trace
4. **Clear Variants**: Use descriptive names (e.g., "original", "indexeddb", "optimized")
5. **Document Context**: Note whether testing in dev or production

### Example Test Scenario

```bash
# Start server with Webpack in production mode
NODE_ENV=production script/server

# Test original implementation
# Run 1: Capture trace → Save as Trace-20251104-original-run1.json
# Run 2: Capture trace → Save as Trace-20251104-original-run2.json
# Run 3: Capture trace → Save as Trace-20251104-original-run3.json

# Test new implementation
# Run 1: Capture trace → Save as Trace-20251104-optimized-run1.json
# Run 2: Capture trace → Save as Trace-20251104-optimized-run2.json
# Run 3: Capture trace → Save as Trace-20251104-optimized-run3.json

# Analyze results
node analyzer.js ./
```

## Understanding the Output

### Performance Metrics

**Duration**: Total time from trace start to end
- Development: 10-20 seconds typical
- Production: 1-5 seconds typical

**Long Tasks**: Operations blocking the main thread >50ms
- Fewer is better
- Large tasks should be broken up

**JavaScript Execution Time**: Time spent running JS code
- Includes compilation and evaluation
- Target for optimization

**Total Blocking Time (TBT)**: Time the main thread is blocked
- Critical for user experience
- Lower = more responsive UI

**Core Web Vitals**: User-centric performance metrics
- FCP (First Contentful Paint): <1.8s good
- LCP (Largest Contentful Paint): <2.5s good
- CLS (Cumulative Layout Shift): <0.1 good
- FID (First Input Delay): <100ms good

### Statistical Analysis

- **μ (mu)**: Mean/average value
- **σ (sigma)**: Standard deviation (variability)
- **median**: Middle value (robust to outliers)

**Interpreting Results:**
- Lower standard deviation = more consistent performance
- Compare means for overall performance
- Check medians if outliers present

## Development vs Production Context

**Important**: Traces captured in development environments will show inflated metrics due to:
- Development server overhead
- Source maps and debugging
- Hot reloading infrastructure
- Unoptimized assets
- Verbose logging

**Rule of Thumb**: Development improvements of 10-20% often translate to 20-30% gains in production.

**Focus On**: Relative improvements between implementations, not absolute values.

## Example Analysis Output

```
📊 Statistical Comparison
================================================================================

OPTIMIZED Implementation:
  metadata.duration: μ=13170.07, σ=490.96, median=13509.84
  javascript.totalExecutionTime: μ=8227.97, σ=506.31, median=8521.87

ORIGINAL Implementation:
  metadata.duration: μ=14893.62, σ=196.55, median=14905.43
  javascript.totalExecutionTime: μ=9887.38, σ=138.56, median=9818.18

Result: 11.6% faster duration, 16.8% less JS execution time ✅
```

## Generating PR Descriptions

Use Copilot to generate professional performance reports:

```
Ask: "run the report and give me a nice analysis I can put into a PR description"
```

Copilot will generate a formatted report with:
- Performance improvement summary table
- Statistical analysis
- Expected production impact
- Key findings and recommendations

## Troubleshooting

### Traces not comparing

- Check file naming follows the convention
- Ensure variant names are in filename (e.g., "original", "indexeddb")
- Verify all traces are in the same directory

### Unexpected metric values

- Confirm you're in the right environment (dev vs production)
- Check CPU throttling was enabled
- Verify consistent test actions across runs

### Missing Core Web Vitals

- Some metrics only appear with user interactions
- FID requires input events
- LCP requires visible content

## Advanced Usage

### Export to JSON for Further Analysis

```bash
node analyzer.js --format=json ./traces > results.json
```

### Custom Thresholds

```bash
# Analyze with 100ms long task threshold instead of 50ms
node analyzer.js --threshold=100 ./traces
```

## Resources

- [Chrome DevTools Performance Documentation](https://developer.chrome.com/docs/devtools/performance/)
- [Web Vitals](https://web.dev/vitals/)
- [Performance Analysis Guide](https://developer.chrome.com/docs/lighthouse/performance/)
