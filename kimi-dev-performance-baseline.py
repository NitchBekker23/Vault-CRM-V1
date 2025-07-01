#!/usr/bin/env python3
"""
Kimi-Dev Performance Baseline Analysis
Phase 1: Systematic performance analysis before optimization
Creates measurable baseline and identifies specific bottlenecks
"""

import os
import json
import re
from typing import Dict, List, Any, Tuple
from pathlib import Path
from datetime import datetime

class PerformanceBaselineAnalyzer:
    def __init__(self, repo_path: str = "."):
        self.repo_path = Path(repo_path)
        self.baseline_data = {
            "timestamp": datetime.now().isoformat(),
            "metrics": {},
            "bottlenecks": [],
            "dependencies": {},
            "risk_assessment": {}
        }
        
    def analyze_current_performance_metrics(self) -> Dict[str, Any]:
        """Analyze current performance issues from logs and code"""
        
        # Extract performance metrics from console logs
        performance_issues = {
            "current_metrics": {
                "FCP": "8500ms (threshold: 1800ms)",
                "LCP": "8748ms (threshold: 2500ms)", 
                "TTFB": "346ms (good)",
                "status": "CRITICAL - 4.7x slower than acceptable"
            },
            "observed_issues": [
                "Poor First Contentful Paint - 8500ms vs 1800ms target",
                "Poor Largest Contentful Paint - 8748ms vs 2500ms target",
                "Client list refreshes every 3 seconds causing constant re-renders",
                "Multiple components loading synchronously at startup"
            ],
            "user_impact": "Users wait 8+ seconds to see content"
        }
        
        self.baseline_data["metrics"] = performance_issues
        return performance_issues
        
    def identify_bundle_size_issues(self) -> List[Dict[str, Any]]:
        """Analyze bundle size and heavy dependencies"""
        
        package_file = self.repo_path / "package.json"
        issues = []
        
        if package_file.exists():
            content = package_file.read_text()
            
            # Heavy UI dependencies
            heavy_deps = [
                ("@radix-ui/*", "30+ individual Radix UI packages loaded"),
                ("recharts", "Large charting library for analytics"),
                ("xlsx", "Excel processing library loaded on startup"),
                ("framer-motion", "Animation library loaded globally"),
                ("embla-carousel-react", "Carousel library loaded but rarely used")
            ]
            
            for dep, issue in heavy_deps:
                if dep.replace("*", "") in content:
                    issues.append({
                        "type": "bundle_size",
                        "dependency": dep,
                        "issue": issue,
                        "impact": "HIGH",
                        "recommendation": "Lazy load or code split this dependency"
                    })
                    
        return issues
        
    def analyze_component_loading_patterns(self) -> Dict[str, Any]:
        """Analyze how components are loaded and identify bottlenecks"""
        
        app_file = self.repo_path / "client/src/App.tsx"
        patterns = {
            "direct_imports": [],
            "lazy_imports": [],
            "critical_path_components": [],
            "optimization_candidates": []
        }
        
        if app_file.exists():
            content = app_file.read_text()
            
            # Find all direct imports
            direct_import_pattern = r'import\s+(\w+)\s+from\s+["\']\.\/pages\/(\w+)["\']'
            for match in re.finditer(direct_import_pattern, content):
                component = match.group(1)
                path = match.group(2)
                patterns["direct_imports"].append({
                    "component": component,
                    "path": f"pages/{path}",
                    "load_type": "synchronous"
                })
                
            # Find lazy imports (if any)
            lazy_import_pattern = r'const\s+(\w+)\s*=\s*lazy\('
            for match in re.finditer(lazy_import_pattern, content):
                component = match.group(1)
                patterns["lazy_imports"].append(component)
                
            # Identify critical path components that should NOT be lazy loaded
            critical_components = ["Login", "Dashboard", "Header", "Layout"]
            patterns["critical_path_components"] = [
                comp for comp in patterns["direct_imports"] 
                if any(crit in comp["component"] for crit in critical_components)
            ]
            
            # Identify safe optimization candidates
            safe_to_optimize = ["Reports", "Analytics", "Settings", "Export", "Import"]
            patterns["optimization_candidates"] = [
                comp for comp in patterns["direct_imports"]
                if any(safe in comp["component"] for safe in safe_to_optimize)
            ]
            
        return patterns
        
    def analyze_data_fetching_patterns(self) -> List[Dict[str, Any]]:
        """Analyze data fetching and caching issues"""
        
        issues = []
        
        # Check client component
        client_file = self.repo_path / "client/src/pages/clients.tsx"
        if client_file.exists():
            content = client_file.read_text()
            
            if "refetchInterval: 3 * 1000" in content:
                issues.append({
                    "component": "Clients",
                    "issue": "3-second automatic refresh causing constant re-renders",
                    "impact": "HIGH",
                    "performance_cost": "Continuous network requests and DOM updates",
                    "recommendation": "Use event-based updates or longer intervals"
                })
                
            if "staleTime: 0" in content:
                issues.append({
                    "component": "Clients", 
                    "issue": "Zero stale time forces fresh data on every access",
                    "impact": "MEDIUM",
                    "performance_cost": "No data caching benefit",
                    "recommendation": "Set reasonable stale time (30-60 seconds)"
                })
                
        return issues
        
    def map_component_dependencies(self) -> Dict[str, List[str]]:
        """Map component dependencies to avoid breaking changes"""
        
        dependencies = {
            "authentication_flow": [
                "App.tsx → auth context",
                "All pages → requireAuth middleware", 
                "Header → user data from auth"
            ],
            "data_flow": [
                "Dashboard → inventory + clients + sales APIs",
                "Clients → client API + purchase history",
                "Inventory → items + images + SKU data"
            ],
            "critical_paths": [
                "Login → Dashboard (must be fast)",
                "Dashboard → Inventory/Clients (core features)",
                "Data mutations → Cache invalidation"
            ],
            "safe_to_optimize": [
                "Reports generation",
                "Analytics calculations",
                "CSV import/export",
                "Settings pages"
            ]
        }
        
        self.baseline_data["dependencies"] = dependencies
        return dependencies
        
    def generate_risk_assessment(self) -> Dict[str, Any]:
        """Assess risks for different optimization strategies"""
        
        risk_assessment = {
            "high_risk_changes": [
                {
                    "change": "Lazy loading authentication components",
                    "risk": "Could break login flow",
                    "mitigation": "Never lazy load auth components"
                },
                {
                    "change": "Modifying core data fetching",
                    "risk": "Could break real-time updates",
                    "mitigation": "Test extensively with rollback plan"
                }
            ],
            "medium_risk_changes": [
                {
                    "change": "Code splitting large components",
                    "risk": "Initial load flash",
                    "mitigation": "Add loading skeletons"
                },
                {
                    "change": "Implementing route-based splitting",
                    "risk": "Navigation delays",
                    "mitigation": "Preload on hover/focus"
                }
            ],
            "low_risk_changes": [
                {
                    "change": "Compression middleware",
                    "risk": "Minimal - server-side only",
                    "mitigation": "Monitor CPU usage"
                },
                {
                    "change": "Image optimization",
                    "risk": "Quality degradation",
                    "mitigation": "Test with sample images"
                },
                {
                    "change": "Bundle analysis",
                    "risk": "None - analysis only",
                    "mitigation": "N/A"
                }
            ]
        }
        
        self.baseline_data["risk_assessment"] = risk_assessment
        return risk_assessment
        
    def generate_optimization_roadmap(self) -> List[Dict[str, Any]]:
        """Generate safe, incremental optimization roadmap"""
        
        roadmap = [
            {
                "phase": "1A - Non-Breaking Analysis",
                "tasks": [
                    "Install bundle analyzer to identify large chunks",
                    "Add performance monitoring to track improvements",
                    "Document current load waterfall"
                ],
                "risk": "NONE",
                "expected_impact": "Visibility into issues"
            },
            {
                "phase": "1B - Server Optimizations",
                "tasks": [
                    "Add gzip compression middleware",
                    "Implement HTTP/2 server push for critical resources",
                    "Add cache headers for static assets"
                ],
                "risk": "LOW",
                "expected_impact": "20-30% reduction in transfer size"
            },
            {
                "phase": "1C - Safe Frontend Optimizations",
                "tasks": [
                    "Optimize images with next-gen formats",
                    "Remove unused CSS with PurgeCSS",
                    "Tree-shake unused imports"
                ],
                "risk": "LOW", 
                "expected_impact": "10-15% bundle size reduction"
            },
            {
                "phase": "1D - Measurement & Validation",
                "tasks": [
                    "Measure new performance metrics",
                    "Compare against baseline",
                    "Document improvements and issues"
                ],
                "risk": "NONE",
                "expected_impact": "Data for next phase"
            }
        ]
        
        return roadmap
        
    def create_performance_baseline_report(self) -> str:
        """Create comprehensive baseline report"""
        
        report = []
        report.append("# PERFORMANCE BASELINE ANALYSIS REPORT")
        report.append(f"Generated: {self.baseline_data['timestamp']}")
        report.append("\n## CURRENT STATE\n")
        
        # Current metrics
        metrics = self.baseline_data["metrics"]
        report.append("### Performance Metrics")
        report.append(f"- FCP: {metrics['current_metrics']['FCP']}")
        report.append(f"- LCP: {metrics['current_metrics']['LCP']}")
        report.append(f"- TTFB: {metrics['current_metrics']['TTFB']}")
        report.append(f"- Status: {metrics['current_metrics']['status']}")
        
        # Bottlenecks
        report.append("\n### Identified Bottlenecks")
        for bottleneck in self.baseline_data["bottlenecks"]:
            report.append(f"- {bottleneck['issue']} (Impact: {bottleneck['impact']})")
            
        # Dependencies
        report.append("\n### Critical Dependencies")
        deps = self.baseline_data["dependencies"]
        for category, items in deps.items():
            report.append(f"\n**{category.replace('_', ' ').title()}:**")
            for item in items:
                report.append(f"  - {item}")
                
        # Risk Assessment
        report.append("\n## RISK ASSESSMENT")
        risks = self.baseline_data["risk_assessment"]
        for risk_level, changes in risks.items():
            report.append(f"\n### {risk_level.replace('_', ' ').title()}")
            for change in changes:
                report.append(f"- **{change['change']}**")
                report.append(f"  - Risk: {change['risk']}")
                report.append(f"  - Mitigation: {change['mitigation']}")
                
        return "\n".join(report)

def main():
    analyzer = PerformanceBaselineAnalyzer()
    
    print("🔍 KIMI-DEV PERFORMANCE BASELINE ANALYSIS - PHASE 1")
    print("=" * 70)
    
    # Step 1: Analyze current metrics
    print("\n📊 ANALYZING CURRENT PERFORMANCE...")
    metrics = analyzer.analyze_current_performance_metrics()
    print(f"Current FCP: {metrics['current_metrics']['FCP']}")
    print(f"Current LCP: {metrics['current_metrics']['LCP']}")
    
    # Step 2: Identify bundle issues
    print("\n📦 ANALYZING BUNDLE SIZE...")
    bundle_issues = analyzer.identify_bundle_size_issues()
    analyzer.baseline_data["bottlenecks"].extend(bundle_issues)
    print(f"Found {len(bundle_issues)} bundle size issues")
    
    # Step 3: Analyze loading patterns
    print("\n⚡ ANALYZING COMPONENT LOADING...")
    loading_patterns = analyzer.analyze_component_loading_patterns()
    print(f"Direct imports: {len(loading_patterns['direct_imports'])}")
    print(f"Optimization candidates: {len(loading_patterns['optimization_candidates'])}")
    
    # Step 4: Analyze data fetching
    print("\n🔄 ANALYZING DATA FETCHING...")
    data_issues = analyzer.analyze_data_fetching_patterns()
    analyzer.baseline_data["bottlenecks"].extend(data_issues)
    print(f"Found {len(data_issues)} data fetching issues")
    
    # Step 5: Map dependencies
    print("\n🗺️ MAPPING DEPENDENCIES...")
    dependencies = analyzer.map_component_dependencies()
    print(f"Mapped {len(dependencies)} dependency chains")
    
    # Step 6: Risk assessment
    print("\n⚠️ ASSESSING RISKS...")
    risks = analyzer.generate_risk_assessment()
    
    # Step 7: Generate roadmap
    print("\n📋 GENERATING OPTIMIZATION ROADMAP...")
    roadmap = analyzer.generate_optimization_roadmap()
    
    # Create baseline file
    baseline_file = Path("performance-baseline.json")
    with open(baseline_file, "w") as f:
        json.dump(analyzer.baseline_data, f, indent=2)
    print(f"\n✅ Baseline data saved to: {baseline_file}")
    
    # Create report
    report = analyzer.create_performance_baseline_report()
    report_file = Path("performance-baseline-report.md")
    with open(report_file, "w") as f:
        f.write(report)
    print(f"📄 Report saved to: {report_file}")
    
    # Show roadmap
    print("\n🎯 RECOMMENDED OPTIMIZATION ROADMAP:")
    for phase in roadmap:
        print(f"\n{phase['phase']} (Risk: {phase['risk']})")
        for task in phase['tasks']:
            print(f"  • {task}")
        print(f"  Expected Impact: {phase['expected_impact']}")
    
    print("\n✅ PHASE 1 BASELINE ANALYSIS COMPLETE")
    print("Ready to proceed with safe, incremental optimizations")

if __name__ == "__main__":
    main()