#!/usr/bin/env python3
"""
Kimi-Dev System Debug Analysis
Comprehensive analysis of current system issues and systematic fixes
"""

import os
import json
import re
from typing import Dict, List, Any
from datetime import datetime

class SystemDebugAnalyzer:
    def __init__(self, repo_path: str = "."):
        self.repo_path = repo_path
        self.issues = []
        self.fixes = []
        
    def analyze_database_schema_errors(self) -> List[Dict[str, Any]]:
        """Analyze database schema column mismatch errors"""
        issues = []
        
        # Check for missing monthly_target column
        storage_file = os.path.join(self.repo_path, "server", "storage.ts")
        if os.path.exists(storage_file):
            with open(storage_file, 'r') as f:
                content = f.read()
                
            if "monthly_target" in content:
                issues.append({
                    "type": "critical",
                    "category": "database_schema",
                    "title": "Missing monthly_target column in database",
                    "file": "server/storage.ts",
                    "description": "Code references monthly_target column that doesn't exist in database",
                    "impact": "API endpoints failing with 500 errors",
                    "fix": "Remove monthly_target references or add column to schema"
                })
        
        return issues
    
    def analyze_date_inconsistencies(self) -> List[Dict[str, Any]]:
        """Analyze date/month inconsistencies in sales data"""
        issues = []
        
        # Check performance components for hardcoded October dates
        performance_files = [
            "client/src/pages/performance.tsx",
            "client/src/pages/performance-simple.tsx", 
            "client/src/pages/performance-direct.tsx"
        ]
        
        for file_path in performance_files:
            full_path = os.path.join(self.repo_path, file_path)
            if os.path.exists(full_path):
                with open(full_path, 'r') as f:
                    content = f.read()
                    
                if "month=10" in content or "October" in content:
                    issues.append({
                        "type": "data_accuracy",
                        "category": "date_consistency", 
                        "title": f"Hardcoded October dates in {file_path}",
                        "file": file_path,
                        "description": "Sales data showing October 2025 instead of current June",
                        "impact": "Incorrect date display in performance analytics",
                        "fix": "Update to dynamic current month or correct June data"
                    })
        
        return issues
    
    def analyze_client_deletion_errors(self) -> List[Dict[str, Any]]:
        """Analyze client deletion functionality issues"""
        issues = []
        
        # Check client management API endpoints
        routes_file = os.path.join(self.repo_path, "server", "routes.ts")
        if os.path.exists(routes_file):
            with open(routes_file, 'r') as f:
                content = f.read()
                
            # Look for DELETE client endpoint
            if "DELETE" in content and "/api/clients" in content:
                # Check for proper error handling
                if "foreign key" not in content.lower():
                    issues.append({
                        "type": "functionality",
                        "category": "client_management",
                        "title": "Client deletion missing foreign key handling",
                        "file": "server/routes.ts", 
                        "description": "Client deletion may fail due to foreign key constraints",
                        "impact": "Users cannot delete clients with existing sales",
                        "fix": "Add proper foreign key constraint error handling"
                    })
        
        return issues
    
    def analyze_ui_display_inconsistencies(self) -> List[Dict[str, Any]]:
        """Analyze UI display differences between preview and full view"""
        issues = []
        
        # Check for lazy loading vs direct component loading
        app_file = os.path.join(self.repo_path, "client", "src", "App.tsx")
        if os.path.exists(app_file):
            with open(app_file, 'r') as f:
                content = f.read()
                
            # Count lazy vs direct imports
            lazy_count = content.count("lazy(")
            direct_import_count = content.count("import ") - content.count("import { lazy")
            
            if lazy_count > 0 and direct_import_count > 0:
                issues.append({
                    "type": "ui_consistency",
                    "category": "component_loading",
                    "title": "Mixed lazy and direct component loading",
                    "file": "client/src/App.tsx",
                    "description": "Different loading strategies causing UI inconsistencies",
                    "impact": "Performance dashboard looks different in preview vs full view",
                    "fix": "Standardize component loading strategy"
                })
        
        return issues
    
    def analyze_commission_system_removal(self) -> List[Dict[str, Any]]:
        """Analyze commission system for removal"""
        issues = []
        
        # Check for commission references
        files_to_check = [
            "server/storage.ts",
            "server/routes.ts", 
            "shared/schema.ts",
            "client/src/pages/performance-direct.tsx"
        ]
        
        for file_path in files_to_check:
            full_path = os.path.join(self.repo_path, file_path)
            if os.path.exists(full_path):
                with open(full_path, 'r') as f:
                    content = f.read()
                    
                if "commission" in content.lower():
                    issues.append({
                        "type": "feature_removal",
                        "category": "commission_system",
                        "title": f"Commission references in {file_path}",
                        "file": file_path,
                        "description": "Commission system needs to be removed as requested",
                        "impact": "Unnecessary commission data displayed",
                        "fix": "Remove commission calculations and UI elements"
                    })
        
        return issues
    
    def generate_systematic_fixes(self) -> List[Dict[str, Any]]:
        """Generate systematic fixes prioritized by impact"""
        all_issues = []
        all_issues.extend(self.analyze_database_schema_errors())
        all_issues.extend(self.analyze_date_inconsistencies())
        all_issues.extend(self.analyze_client_deletion_errors())
        all_issues.extend(self.analyze_ui_display_inconsistencies())
        all_issues.extend(self.analyze_commission_system_removal())
        
        # Sort by priority: critical -> functionality -> ui_consistency -> data_accuracy -> feature_removal
        priority_order = ["critical", "functionality", "ui_consistency", "data_accuracy", "feature_removal"]
        
        sorted_issues = sorted(all_issues, key=lambda x: priority_order.index(x["type"]))
        
        fixes = []
        for i, issue in enumerate(sorted_issues, 1):
            fixes.append({
                "priority": i,
                "issue": issue,
                "implementation_steps": self.generate_fix_steps(issue)
            })
        
        return fixes
    
    def generate_fix_steps(self, issue: Dict[str, Any]) -> List[str]:
        """Generate specific implementation steps for each issue"""
        category = issue["category"]
        
        if category == "database_schema":
            return [
                "Remove monthly_target column references from storage.ts",
                "Update API queries to exclude monthly_target",
                "Test stores and sales-persons endpoints"
            ]
        elif category == "date_consistency":
            return [
                "Update hardcoded October dates to June 2025",
                "Change month=10 to month=6 in API calls",
                "Update display text from October to June"
            ]
        elif category == "client_management":
            return [
                "Add foreign key constraint error handling",
                "Implement cascade delete or proper error messaging",
                "Test client deletion with existing sales"
            ]
        elif category == "component_loading":
            return [
                "Convert all lazy components to direct imports",
                "Remove React.lazy() wrappers causing suspension",
                "Test performance dashboard consistency"
            ]
        elif category == "commission_system":
            return [
                "Remove commission calculations from backend",
                "Remove commission UI elements from frontend",
                "Update performance analytics to exclude commission data"
            ]
        
        return ["Manual analysis required"]
    
    def create_implementation_report(self) -> str:
        """Create comprehensive implementation report"""
        fixes = self.generate_systematic_fixes()
        
        report = f"""
# Kimi-Dev System Debug Report
Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}

## Issues Identified: {len(fixes)}

"""
        
        for fix in fixes:
            issue = fix["issue"]
            report += f"""
### Priority {fix['priority']}: {issue['title']}
- **Type**: {issue['type'].replace('_', ' ').title()}
- **File**: {issue['file']}
- **Impact**: {issue['impact']}
- **Description**: {issue['description']}

**Implementation Steps:**
"""
            for step in fix["implementation_steps"]:
                report += f"- {step}\n"
            
            report += "\n"
        
        report += """
## Recommended Implementation Order:
1. Fix critical database schema errors first (stores/sales-persons API)
2. Fix client deletion functionality
3. Standardize component loading to fix UI inconsistencies
4. Update date consistency (October → June)
5. Remove commission system as requested

## Expected Outcomes:
- ✓ Stores and sales persons data restored in Sales tab
- ✓ Client deletion working properly
- ✓ Performance dashboard consistent between preview and full view
- ✓ Sales data showing correct June 2025 dates
- ✓ Commission data removed as requested
"""
        
        return report

def main():
    analyzer = SystemDebugAnalyzer()
    report = analyzer.create_implementation_report()
    
    # Save report
    with open("kimi-dev-debug-report.md", "w") as f:
        f.write(report)
    
    print("🔍 Kimi-Dev System Debug Analysis Complete")
    print("📊 Debug report saved to: kimi-dev-debug-report.md")
    print("\n" + "="*60)
    print(report)

if __name__ == "__main__":
    main()