#!/usr/bin/env python3
"""
Kimi-Dev Phase 2 Advanced Analysis
Deep code analysis for performance, security, and architecture improvements
"""

import os
import json
import re
from pathlib import Path
from typing import Dict, List, Any
from rich.console import Console
from rich.table import Table
from rich.panel import Panel

console = Console()

class Phase2Analyzer:
    def __init__(self, repo_path: str = "."):
        self.repo_path = Path(repo_path)
        
    def analyze_dashboard_metrics_error(self) -> List[Dict[str, Any]]:
        """Analyze the dashboard metrics database error"""
        console.print("[bold red]Analyzing Dashboard Metrics Database Error...[/bold red]")
        
        issues = []
        
        # Check routes.ts for dashboard metrics implementation
        routes_path = self.repo_path / "server/routes.ts"
        if routes_path.exists():
            with open(routes_path, 'r') as f:
                content = f.read()
                
            # Look for dashboard metrics endpoint
            if "/api/dashboard/metrics" in content:
                issues.append({
                    "file": "server/routes.ts",
                    "issue": "Dashboard metrics database error - Date object serialization",
                    "severity": "HIGH",
                    "description": "ERR_INVALID_ARG_TYPE: Date object passed where string expected in PostgreSQL query",
                    "fix": "Convert Date objects to ISO strings before database queries",
                    "error_pattern": "The \"string\" argument must be of type string or an instance of Buffer"
                })
        
        return issues
    
    def analyze_image_lazy_loading_opportunities(self) -> List[Dict[str, Any]]:
        """Analyze opportunities for image lazy loading implementation"""
        console.print("[bold blue]Analyzing Image Loading Optimization...[/bold blue]")
        
        issues = []
        
        # Check inventory components for image loading
        image_components = [
            "client/src/components/inventory-table.tsx",
            "client/src/components/inventory-card-view.tsx",
            "client/src/components/item-details-modal.tsx"
        ]
        
        for component_path in image_components:
            path = self.repo_path / component_path
            if path.exists():
                with open(path, 'r') as f:
                    content = f.read()
                    
                # Check for eager loading
                if 'loading="eager"' in content or 'loading=\"eager\"' in content:
                    issues.append({
                        "file": component_path,
                        "issue": "Images using eager loading instead of lazy loading",
                        "severity": "MEDIUM", 
                        "description": "All images load immediately, impacting initial page performance",
                        "fix": "Implement intersection observer-based lazy loading for images"
                    })
                
                # Check for missing loading attribute
                if '<img' in content and 'loading=' not in content:
                    issues.append({
                        "file": component_path,
                        "issue": "Images missing loading strategy",
                        "severity": "MEDIUM",
                        "description": "No loading strategy specified for images",
                        "fix": "Add loading='lazy' attribute to non-critical images"
                    })
        
        return issues
    
    def analyze_bundle_size_optimization(self) -> List[Dict[str, Any]]:
        """Analyze bundle size and code splitting opportunities"""
        console.print("[bold yellow]Analyzing Bundle Size Optimization...[/bold yellow]")
        
        issues = []
        
        # Check for large component files
        large_components = []
        
        for root, dirs, files in os.walk(self.repo_path / "client/src"):
            for file in files:
                if file.endswith(('.tsx', '.ts')):
                    file_path = Path(root) / file
                    try:
                        file_size = file_path.stat().st_size
                        if file_size > 15000:  # Files larger than 15KB
                            large_components.append({
                                "file": str(file_path.relative_to(self.repo_path)),
                                "size_kb": round(file_size / 1024, 2)
                            })
                    except:
                        pass
        
        if large_components:
            component_list = []
            for c in large_components[:3]:
                component_list.append(f"{c['file']} ({c['size_kb']}KB)")
            description = f"Large components increase bundle size: {', '.join(component_list)}"
            
            issues.append({
                "file": "Multiple large components", 
                "issue": "Large component files detected",
                "severity": "MEDIUM",
                "description": description,
                "fix": "Implement code splitting and lazy loading for large components"
            })
        
        # Check for missing React.lazy imports
        app_path = self.repo_path / "client/src/App.tsx"
        if app_path.exists():
            with open(app_path, 'r') as f:
                content = f.read()
                
            if "React.lazy" not in content and "lazy(" not in content:
                issues.append({
                    "file": "client/src/App.tsx",
                    "issue": "No code splitting implemented",
                    "severity": "MEDIUM",
                    "description": "All components loaded synchronously, increasing initial bundle size",
                    "fix": "Implement React.lazy for non-critical route components"
                })
        
        return issues
    
    def analyze_error_handling_gaps(self) -> List[Dict[str, Any]]:
        """Analyze error handling gaps in critical components"""
        console.print("[bold magenta]Analyzing Error Handling Gaps...[/bold magenta]")
        
        issues = []
        
        # Check critical components for error handling
        critical_components = [
            "client/src/components/image-upload.tsx",
            "client/src/components/item-details-modal.tsx",
            "client/src/pages/dashboard.tsx"
        ]
        
        for component_path in critical_components:
            path = self.repo_path / component_path
            if path.exists():
                with open(path, 'r') as f:
                    content = f.read()
                    
                # Check for try-catch blocks
                has_try_catch = re.search(r'try\s*\{.*?\}\s*catch', content, re.DOTALL)
                has_error_boundary = "ErrorBoundary" in content
                
                if not has_try_catch and not has_error_boundary:
                    issues.append({
                        "file": component_path,
                        "issue": "Missing comprehensive error handling",
                        "severity": "MEDIUM",
                        "description": "No try-catch blocks or error boundaries detected",
                        "fix": "Add error boundaries and try-catch for async operations"
                    })
        
        return issues
    
    def analyze_performance_monitoring_gaps(self) -> List[Dict[str, Any]]:
        """Analyze performance monitoring implementation gaps"""
        console.print("[bold cyan]Analyzing Performance Monitoring Gaps...[/bold cyan]")
        
        issues = []
        
        # Check for performance monitoring
        server_index = self.repo_path / "server/index.ts"
        if server_index.exists():
            with open(server_index, 'r') as f:
                content = f.read()
                
            # Check for performance middleware
            if "performance" not in content.lower() and "timing" not in content.lower():
                issues.append({
                    "file": "server/index.ts",
                    "issue": "No performance monitoring middleware",
                    "severity": "LOW",
                    "description": "No request timing or performance metrics collection",
                    "fix": "Add express middleware for request timing and performance metrics"
                })
        
        # Check for client-side performance monitoring
        main_tsx = self.repo_path / "client/src/main.tsx"
        if main_tsx.exists():
            with open(main_tsx, 'r') as f:
                content = f.read()
                
            if "performance" not in content.lower() and "vitals" not in content.lower():
                issues.append({
                    "file": "client/src/main.tsx",
                    "issue": "No client-side performance monitoring",
                    "severity": "LOW",
                    "description": "No Web Vitals or performance metrics collection",
                    "fix": "Add Web Vitals monitoring for Core Web Vitals metrics"
                })
        
        return issues
    
    def analyze_api_response_optimization(self) -> List[Dict[str, Any]]:
        """Analyze API response optimization opportunities"""
        console.print("[bold green]Analyzing API Response Optimization...[/bold green]")
        
        issues = []
        
        # Check routes.ts for pagination and response optimization
        routes_path = self.repo_path / "server/routes.ts"
        if routes_path.exists():
            with open(routes_path, 'r') as f:
                content = f.read()
                
            # Check for pagination in inventory endpoint
            if "/api/inventory" in content and "limit" not in content:
                issues.append({
                    "file": "server/routes.ts",
                    "issue": "Inventory API missing pagination",
                    "severity": "MEDIUM",
                    "description": "Inventory endpoint returns all items without pagination",
                    "fix": "Implement pagination with limit/offset parameters"
                })
            
            # Check for response compression
            if "compression" not in content and "gzip" not in content:
                issues.append({
                    "file": "server/index.ts",
                    "issue": "No response compression middleware",
                    "severity": "LOW",
                    "description": "API responses not compressed, increasing transfer size",
                    "fix": "Add compression middleware for gzip/deflate responses"
                })
        
        return issues
    
    def generate_phase2_improvements(self) -> Dict[str, Any]:
        """Generate Phase 2 improvement recommendations"""
        console.print("[bold white]Generating Phase 2 Advanced Improvements...[/bold white]")
        
        all_issues = []
        all_issues.extend(self.analyze_dashboard_metrics_error())
        all_issues.extend(self.analyze_image_lazy_loading_opportunities())
        all_issues.extend(self.analyze_bundle_size_optimization())
        all_issues.extend(self.analyze_error_handling_gaps())
        all_issues.extend(self.analyze_performance_monitoring_gaps())
        all_issues.extend(self.analyze_api_response_optimization())
        
        # Categorize by severity
        high_priority = [issue for issue in all_issues if issue["severity"] == "HIGH"]
        medium_priority = [issue for issue in all_issues if issue["severity"] == "MEDIUM"]
        low_priority = [issue for issue in all_issues if issue["severity"] == "LOW"]
        
        return {
            "high_priority": high_priority,
            "medium_priority": medium_priority,
            "low_priority": low_priority,
            "total_issues": len(all_issues)
        }

def main():
    analyzer = Phase2Analyzer()
    improvements = analyzer.generate_phase2_improvements()
    
    # Display summary
    console.print(f"\n[bold red]Phase 2 High Priority Issues: {len(improvements['high_priority'])}[/bold red]")
    console.print(f"[bold yellow]Phase 2 Medium Priority Issues: {len(improvements['medium_priority'])}[/bold yellow]")
    console.print(f"[bold green]Phase 2 Low Priority Issues: {len(improvements['low_priority'])}[/bold green]")
    console.print(f"[bold blue]Total Additional Improvements Available: {improvements['total_issues']}[/bold blue]")
    
    # Show detailed issues
    if improvements['high_priority']:
        high_panel = Panel(
            "\n".join([f"• {issue['issue']} ({issue['file']})" for issue in improvements['high_priority']]),
            title="🚨 Critical Issues Found",
            border_style="red"
        )
        console.print(high_panel)
    
    if improvements['medium_priority']:
        medium_panel = Panel(
            "\n".join([f"• {issue['issue']} ({issue['file']})" for issue in improvements['medium_priority']]),
            title="⚡ Performance & Quality Improvements",
            border_style="yellow"
        )
        console.print(medium_panel)
        
    if improvements['low_priority']:
        low_panel = Panel(
            "\n".join([f"• {issue['issue']} ({issue['file']})" for issue in improvements['low_priority']]),
            title="📊 Monitoring & Enhancement Opportunities",
            border_style="green"
        )
        console.print(low_panel)
    
    # Save detailed analysis
    with open("vault-phase2-improvements.json", "w") as f:
        json.dump(improvements, f, indent=2)
    
    console.print(f"\n[bold green]✓ Phase 2 analysis saved to: vault-phase2-improvements.json[/bold green]")
    
    return improvements

if __name__ == "__main__":
    main()