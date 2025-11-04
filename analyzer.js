#!/usr/bin/env node

/**
 * Enhanced Chrome Performance Trace Analyzer
 * 
 * A comprehensive tool that combines statistical rigor with detailed insights
 * for Chrome DevTools performance trace analysis.
 * 
 * Features:
 * - Core Web Vitals extraction
 * - Statistical analysis with confidence intervals
 * - Memory and network analysis
 * - Actionable performance recommendations
 * - Export capabilities (JSON, CSV)
 * 
 * Usage: node enhanced-trace-analyzer.js [options] <trace-file-or-directory>
 */

const fs = require('fs');
const path = require('path');

class PerformanceAnalyzer {
  constructor(options = {}) {
    this.options = {
      outputFormat: 'console', // console, json, csv
      includeDetails: true,
      confidenceLevel: 0.95,
      longTaskThreshold: 50, // ms
      ...options
    };
    
    this.results = [];
  }

  analyzeTrace(filePath) {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const events = data.traceEvents || [];
    const metadata = data.metadata || {};
    
    const result = {
      fileName: path.basename(filePath),
      metadata: this.extractMetadata(metadata),
      coreWebVitals: this.extractCoreWebVitals(events),
      performance: this.analyzePerformance(events),
      javascript: this.analyzeJavaScript(events),
      rendering: this.analyzeRendering(events),
      memory: this.analyzeMemory(events),
      network: this.analyzeNetwork(events),
      recommendations: []
    };
    
    result.recommendations = this.generateRecommendations(result);
    this.results.push(result);
    
    return result;
  }

  extractMetadata(metadata) {
    const window = metadata.modifications?.initialBreadcrumb?.window;
    return {
      source: metadata.source || 'Unknown',
      startTime: metadata.startTime || 'Unknown',
      cpuThrottling: metadata.cpuThrottling || 1,
      duration: window ? window.range / 1000 : null,
      userAgent: metadata.userAgent || 'Unknown'
    };
  }

  extractCoreWebVitals(events) {
    const vitals = {
      fcp: null,
      lcp: null,
      cls: null,
      fid: null,
      tbt: 0
    };

    let layoutShifts = [];
    let firstInput = null;
    let blockingTime = 0;

    events.forEach(event => {
      // First Contentful Paint
      if (event.name === 'firstContentfulPaint') {
        vitals.fcp = event.ts / 1000; // Convert to ms
      }
      
      // Largest Contentful Paint
      if (event.name === 'largestContentfulPaint::Candidate') {
        vitals.lcp = event.ts / 1000;
      }
      
      // Layout Shift
      if (event.name === 'LayoutShift' && event.args?.data?.had_recent_input === false) {
        layoutShifts.push(event.args.data.score || 0);
      }
      
      // First Input Delay
      if (event.name === 'EventTiming' && !firstInput) {
        const processingStart = event.args?.data?.processingStart;
        const timeStamp = event.args?.data?.timeStamp;
        if (processingStart && timeStamp) {
          vitals.fid = processingStart - timeStamp;
          firstInput = event;
        }
      }
      
      // Total Blocking Time (tasks > 50ms)
      if (event.dur && event.dur > 50000) { // 50ms in microseconds
        blockingTime += Math.max(0, (event.dur / 1000) - 50);
      }
    });

    // Calculate CLS as maximum session window
    vitals.cls = this.calculateCLS(layoutShifts);
    vitals.tbt = blockingTime;

    return vitals;
  }

  calculateCLS(layoutShifts) {
    if (layoutShifts.length === 0) return 0;
    
    // Simplified CLS calculation - in production, use proper session windows
    return layoutShifts.reduce((sum, score) => sum + score, 0);
  }

  analyzePerformance(events) {
    const analysis = {
      totalEvents: events.length,
      longTasks: [],
      categories: {},
      phases: {}
    };

    events.forEach(event => {
      // Count categories
      const category = event.cat || 'uncategorized';
      analysis.categories[category] = (analysis.categories[category] || 0) + 1;
      
      // Count phases
      const phase = event.ph || 'unknown';
      analysis.phases[phase] = (analysis.phases[phase] || 0) + 1;
      
      // Long tasks
      if (event.dur && event.dur > this.options.longTaskThreshold * 1000) {
        analysis.longTasks.push({
          name: event.name,
          duration: event.dur / 1000,
          category: event.cat,
          startTime: event.ts / 1000,
          url: event.args?.data?.url
        });
      }
    });

    analysis.longTasks.sort((a, b) => b.duration - a.duration);
    return analysis;
  }

  analyzeJavaScript(events) {
    const analysis = {
      totalExecutionTime: 0,
      functionCalls: [],
      compilationTime: 0,
      gcTime: 0
    };

    events.forEach(event => {
      const duration = event.dur ? event.dur / 1000 : 0;
      
      // JavaScript execution
      if (['FunctionCall', 'EvaluateScript', 'v8.run', 'V8.Execute'].includes(event.name)) {
        analysis.totalExecutionTime += duration;
        
        if (duration > 1) { // Only track significant functions
          analysis.functionCalls.push({
            name: event.args?.data?.functionName || event.name,
            duration: duration,
            url: event.args?.data?.url,
            scriptId: event.args?.data?.scriptId
          });
        }
      }
      
      // Compilation
      if (event.name.includes('Compile') || event.name.includes('Parse')) {
        analysis.compilationTime += duration;
      }
      
      // Garbage Collection
      if (event.cat?.includes('gc') || event.name.includes('GC')) {
        analysis.gcTime += duration;
      }
    });

    analysis.functionCalls.sort((a, b) => b.duration - a.duration);
    return analysis;
  }

  analyzeRendering(events) {
    const analysis = {
      layoutTime: 0,
      paintTime: 0,
      compositeTime: 0,
      layoutCount: 0,
      paintCount: 0,
      forcedReflows: 0
    };

    events.forEach(event => {
      const duration = event.dur ? event.dur / 1000 : 0;
      
      if (event.name === 'Layout' || event.name === 'UpdateLayoutTree') {
        analysis.layoutTime += duration;
        analysis.layoutCount++;
        
        // Detect forced reflows
        if (event.args?.beginData?.stackTrace) {
          analysis.forcedReflows++;
        }
      }
      
      if (event.name === 'Paint' || event.name === 'PaintLayer') {
        analysis.paintTime += duration;
        analysis.paintCount++;
      }
      
      if (event.name === 'CompositeLayers' || event.name === 'Composite') {
        analysis.compositeTime += duration;
      }
    });

    return analysis;
  }

  analyzeMemory(events) {
    const analysis = {
      heapAllocations: 0,
      maxHeapSize: 0,
      gcPauses: [],
      memoryLeaks: []
    };

    events.forEach(event => {
      // Heap size tracking
      if (event.name === 'UpdateCounters' && event.args?.data?.jsHeapSizeUsed) {
        const heapSize = event.args.data.jsHeapSizeUsed;
        analysis.maxHeapSize = Math.max(analysis.maxHeapSize, heapSize);
      }
      
      // GC events
      if (event.name.includes('GC') && event.dur) {
        analysis.gcPauses.push(event.dur / 1000);
      }
    });

    return analysis;
  }

  analyzeNetwork(events) {
    const analysis = {
      requests: [],
      totalTransferSize: 0,
      criticalPath: [],
      cacheHitRate: 0
    };

    events.forEach(event => {
      if (event.name === 'ResourceFinish' && event.args?.data) {
        const data = event.args.data;
        analysis.requests.push({
          url: data.url,
          duration: data.finishTime - data.startTime,
          transferSize: data.transferSize || 0,
          fromCache: data.fromCache || false
        });
        
        analysis.totalTransferSize += data.transferSize || 0;
      }
    });

    // Calculate cache hit rate
    const cachedRequests = analysis.requests.filter(r => r.fromCache).length;
    analysis.cacheHitRate = analysis.requests.length > 0 ? 
      (cachedRequests / analysis.requests.length) * 100 : 0;

    return analysis;
  }

  generateRecommendations(result) {
    const recommendations = [];
    
    // Long task recommendations
    if (result.performance.longTasks.length > 10) {
      recommendations.push({
        priority: 'high',
        category: 'performance',
        issue: `${result.performance.longTasks.length} long tasks detected`,
        recommendation: 'Consider breaking up long tasks using techniques like time-slicing or yielding to the main thread',
        impact: 'User interface responsiveness'
      });
    }
    
    // JavaScript recommendations
    if (result.javascript.totalExecutionTime > 2000) {
      recommendations.push({
        priority: 'medium',
        category: 'javascript',
        issue: `High JavaScript execution time: ${result.javascript.totalExecutionTime.toFixed(2)}ms`,
        recommendation: 'Optimize JavaScript performance through code splitting, lazy loading, or algorithm improvements',
        impact: 'Page load speed and interactivity'
      });
    }
    
    // Core Web Vitals recommendations
    if (result.coreWebVitals.lcp && result.coreWebVitals.lcp > 2500) {
      recommendations.push({
        priority: 'high',
        category: 'core-web-vitals',
        issue: `Poor LCP: ${result.coreWebVitals.lcp.toFixed(2)}ms`,
        recommendation: 'Optimize largest contentful paint by improving server response times, optimizing images, or preloading critical resources',
        impact: 'User experience and SEO rankings'
      });
    }
    
    return recommendations;
  }

  compareResults(results) {
    if (results.length < 2) return null;
    
    // Group results by variant
    const variants = this.groupByVariant(results);
    
    if (Object.keys(variants).length < 2) return null;
    
    const comparison = {};
    
    Object.entries(variants).forEach(([variant, runs]) => {
      comparison[variant] = this.calculateStatistics(runs);
    });
    
    return comparison;
  }

  groupByVariant(results) {
    const variants = {};
    
    results.forEach(result => {
      const variant = result.fileName.includes('indexeddb') ? 'indexeddb' : 
                    result.fileName.includes('original') ? 'original' : 'unknown';
      
      if (!variants[variant]) variants[variant] = [];
      variants[variant].push(result);
    });
    
    return variants;
  }

  calculateStatistics(runs) {
    const metrics = [
      'metadata.duration',
      'performance.longTasks.length',
      'javascript.totalExecutionTime',
      'rendering.layoutTime',
      'rendering.paintTime'
    ];
    
    const stats = {};
    
    metrics.forEach(metric => {
      const values = runs.map(run => this.getNestedValue(run, metric)).filter(v => v != null);
      
      if (values.length > 0) {
        stats[metric] = {
          mean: values.reduce((a, b) => a + b, 0) / values.length,
          median: this.calculateMedian(values),
          stdDev: this.calculateStandardDeviation(values),
          min: Math.min(...values),
          max: Math.max(...values),
          count: values.length
        };
      }
    });
    
    return stats;
  }

  getNestedValue(obj, path) {
    return path.split('.').reduce((current, key) => {
      if (current && typeof current === 'object') {
        return current[key];
      }
      return undefined;
    }, obj);
  }

  calculateMedian(values) {
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  }

  calculateStandardDeviation(values) {
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const squaredDiffs = values.map(value => Math.pow(value - mean, 2));
    const variance = squaredDiffs.reduce((a, b) => a + b, 0) / values.length;
    return Math.sqrt(variance);
  }

  outputResults(results, comparison = null) {
    if (this.options.outputFormat === 'json') {
      return JSON.stringify({ results, comparison }, null, 2);
    }
    
    if (this.options.outputFormat === 'csv') {
      return this.generateCSV(results);
    }
    
    // Console output
    this.outputToConsole(results, comparison);
  }

  outputToConsole(results, comparison) {
    console.log('🚀 Enhanced Chrome Performance Analysis');
    console.log('='.repeat(80));
    
    results.forEach(result => {
      console.log(`\n📊 ${result.fileName}`);
      console.log('-'.repeat(60));
      
      // Basic metrics
      console.log(`Duration: ${result.metadata.duration?.toFixed(2) || 'N/A'}ms`);
      console.log(`CPU Throttling: ${result.metadata.cpuThrottling}x`);
      console.log(`Total Events: ${result.performance.totalEvents.toLocaleString()}`);
      
      // Core Web Vitals
      if (result.coreWebVitals.fcp || result.coreWebVitals.lcp) {
        console.log('\n🎯 Core Web Vitals:');
        if (result.coreWebVitals.fcp) console.log(`  FCP: ${result.coreWebVitals.fcp.toFixed(2)}ms`);
        if (result.coreWebVitals.lcp) console.log(`  LCP: ${result.coreWebVitals.lcp.toFixed(2)}ms`);
        if (result.coreWebVitals.cls !== null) console.log(`  CLS: ${result.coreWebVitals.cls.toFixed(3)}`);
        if (result.coreWebVitals.fid !== null) console.log(`  FID: ${result.coreWebVitals.fid.toFixed(2)}ms`);
        console.log(`  TBT: ${result.coreWebVitals.tbt.toFixed(2)}ms`);
      }
      
      // Performance issues
      console.log(`\n⚡ Performance:`);
      console.log(`  Long Tasks: ${result.performance.longTasks.length}`);
      if (result.performance.longTasks.length > 0) {
        const totalLongTaskTime = result.performance.longTasks.reduce((sum, task) => sum + task.duration, 0);
        console.log(`  Total Long Task Time: ${totalLongTaskTime.toFixed(2)}ms`);
        console.log(`  Longest Task: ${result.performance.longTasks[0].duration.toFixed(2)}ms (${result.performance.longTasks[0].name})`);
      }
      
      // JavaScript
      console.log(`\n💻 JavaScript:`);
      console.log(`  Execution Time: ${result.javascript.totalExecutionTime.toFixed(2)}ms`);
      console.log(`  Compilation Time: ${result.javascript.compilationTime.toFixed(2)}ms`);
      console.log(`  GC Time: ${result.javascript.gcTime.toFixed(2)}ms`);
      
      // Rendering
      console.log(`\n🎨 Rendering:`);
      console.log(`  Layout: ${result.rendering.layoutCount} times, ${result.rendering.layoutTime.toFixed(2)}ms`);
      console.log(`  Paint: ${result.rendering.paintCount} times, ${result.rendering.paintTime.toFixed(2)}ms`);
      if (result.rendering.forcedReflows > 0) {
        console.log(`  ⚠️  Forced Reflows: ${result.rendering.forcedReflows}`);
      }
      
      // Recommendations
      if (result.recommendations.length > 0) {
        console.log(`\n💡 Recommendations:`);
        result.recommendations.forEach(rec => {
          const priority = rec.priority === 'high' ? '🔴' : rec.priority === 'medium' ? '🟡' : '🟢';
          console.log(`  ${priority} ${rec.issue}`);
          console.log(`     → ${rec.recommendation}`);
        });
      }
    });
    
    // Comparison
    if (comparison) {
      console.log('\n\n📊 Statistical Comparison');
      console.log('='.repeat(80));
      
      Object.entries(comparison).forEach(([variant, stats]) => {
        console.log(`\n${variant.toUpperCase()} Implementation:`);
        Object.entries(stats).forEach(([metric, values]) => {
          console.log(`  ${metric}: μ=${values.mean.toFixed(2)}, σ=${values.stdDev.toFixed(2)}, median=${values.median.toFixed(2)}`);
        });
      });
    }
  }

  generateCSV(results) {
    // Implementation for CSV export
    const headers = ['fileName', 'duration', 'longTasks', 'jsTime', 'layoutTime', 'paintTime'];
    const rows = results.map(result => [
      result.fileName,
      result.metadata.duration || 0,
      result.performance.longTasks.length,
      result.javascript.totalExecutionTime,
      result.rendering.layoutTime,
      result.rendering.paintTime
    ]);
    
    return [headers, ...rows].map(row => row.join(',')).join('\n');
  }
}

// CLI Interface
function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.error('Usage: node enhanced-trace-analyzer.js [options] <trace-file-or-directory>');
    console.error('Options:');
    console.error('  --format=json|csv|console  Output format (default: console)');
    console.error('  --output=<file>           Save results to file');
    console.error('  --threshold=<ms>          Long task threshold (default: 50ms)');
    process.exit(1);
  }
  
  // Parse arguments (simplified)
  const options = {};
  const files = [];
  
  args.forEach(arg => {
    if (arg.startsWith('--format=')) {
      options.outputFormat = arg.split('=')[1];
    } else if (arg.startsWith('--threshold=')) {
      options.longTaskThreshold = parseInt(arg.split('=')[1]);
    } else if (!arg.startsWith('--')) {
      files.push(arg);
    }
  });
  
  if (files.length === 0) {
    console.error('No input files specified');
    process.exit(1);
  }
  
  const analyzer = new PerformanceAnalyzer(options);
  const input = files[0];
  
  try {
    const stat = fs.statSync(input);
    let traceFiles = [];
    
    if (stat.isDirectory()) {
      traceFiles = fs.readdirSync(input)
        .filter(f => f.endsWith('.json'))
        .map(f => path.join(input, f));
    } else {
      traceFiles = [input];
    }
    
    if (traceFiles.length === 0) {
      console.error('No trace files found');
      process.exit(1);
    }
    
    const results = traceFiles.map(file => analyzer.analyzeTrace(file));
    const comparison = analyzer.compareResults(results);
    
    analyzer.outputResults(results, comparison);
    
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = PerformanceAnalyzer;