#!/usr/bin/env python3
"""
Kimi-Dev Wishlist Manual Creation Debug Analysis
Systematic debugging of manual wishlist creation failure using Kimi-Dev methodology
"""

import os
import json
import re
from typing import Dict, List, Any
from pathlib import Path

class WishlistDebugAnalyzer:
    def __init__(self, repo_path: str = "."):
        self.repo_path = Path(repo_path)
        
    def analyze_manual_wishlist_creation_flow(self) -> List[Dict[str, Any]]:
        """Analyze the complete manual wishlist creation flow"""
        issues = []
        
        # 1. Frontend form data preparation
        wishlist_table_path = self.repo_path / "client/src/components/wishlist-table.tsx"
        if wishlist_table_path.exists():
            content = wishlist_table_path.read_text()
            
            # Check form schema and data mapping
            if "WishlistFormData" in content:
                issues.append({
                    "component": "Frontend Form",
                    "issue": "Check WishlistFormData type mapping",
                    "severity": "medium",
                    "details": "Need to verify form data structure matches backend expectations"
                })
            
            # Check mutation implementation
            if "createWishlistMutation" in content:
                issues.append({
                    "component": "Frontend Mutation",
                    "issue": "Verify mutation data transformation",
                    "severity": "high",
                    "details": "Check if form data is properly transformed before sending to API"
                })
        
        # 2. API endpoint analysis
        routes_path = self.repo_path / "server/routes.ts"
        if routes_path.exists():
            content = routes_path.read_text()
            
            # Find wishlist POST endpoint
            if "POST" in content and "/api/wishlist" in content:
                issues.append({
                    "component": "API Endpoint",
                    "issue": "Verify POST /api/wishlist implementation",
                    "severity": "high",
                    "details": "Check authentication, validation, and data processing"
                })
        
        # 3. Database schema validation
        schema_path = self.repo_path / "shared/schema.ts"
        if schema_path.exists():
            content = schema_path.read_text()
            
            if "wishlist" in content.lower():
                issues.append({
                    "component": "Database Schema",
                    "issue": "Verify wishlist table schema matches form data",
                    "severity": "medium",
                    "details": "Check field names, types, and required fields"
                })
        
        return issues
    
    def analyze_authentication_flow(self) -> Dict[str, Any]:
        """Analyze authentication issues with wishlist creation"""
        analysis = {
            "authentication_method": "session-based",
            "potential_issues": [],
            "recommendations": []
        }
        
        # Check authentication middleware
        routes_path = self.repo_path / "server/routes.ts"
        if routes_path.exists():
            content = routes_path.read_text()
            
            if "checkAuth" in content:
                analysis["potential_issues"].append({
                    "issue": "Authentication middleware may be inconsistent",
                    "details": "Multiple auth patterns found in codebase"
                })
        
        return analysis
    
    def analyze_data_validation_issues(self) -> List[Dict[str, Any]]:
        """Analyze data validation and transformation issues"""
        issues = []
        
        # Check Zod schema validation
        schema_path = self.repo_path / "shared/schema.ts"
        if schema_path.exists():
            content = schema_path.read_text()
            
            if "insertWishlistSchema" in content:
                issues.append({
                    "component": "Validation Schema",
                    "issue": "Verify insertWishlistSchema matches form structure",
                    "severity": "high",
                    "fix": "Ensure form fields match schema exactly"
                })
        
        # Check field mapping issues
        storage_path = self.repo_path / "server/storage.ts"
        if storage_path.exists():
            content = storage_path.read_text()
            
            if "createWishlistItem" in content:
                issues.append({
                    "component": "Storage Layer",
                    "issue": "Field mapping between API and database",
                    "severity": "high",
                    "fix": "Check userId vs createdBy field mapping"
                })
        
        return issues
    
    def generate_systematic_debug_plan(self) -> Dict[str, Any]:
        """Generate systematic debugging plan"""
        return {
            "phase_1_frontend_debugging": [
                "Add console.log to form submission to see exact data being sent",
                "Verify form validation is passing",
                "Check if mutation is being triggered",
                "Add error boundary to catch React errors"
            ],
            "phase_2_api_debugging": [
                "Add detailed logging to POST /api/wishlist endpoint",
                "Log request body and validation results",
                "Check authentication status in endpoint",
                "Verify database query execution"
            ],
            "phase_3_database_debugging": [
                "Add SQL query logging",
                "Check for constraint violations",
                "Verify field types and nullable constraints",
                "Test manual database insertion"
            ],
            "phase_4_integration_testing": [
                "Test with minimal data first",
                "Compare with working lead-to-wishlist flow",
                "Verify session persistence",
                "Test with different user accounts"
            ]
        }
    
    def create_implementation_fixes(self) -> List[str]:
        """Create step-by-step implementation fixes"""
        return [
            "1. Add comprehensive logging to frontend wishlist creation mutation",
            "2. Add server-side logging to POST /api/wishlist endpoint",
            "3. Verify form data structure matches backend expectations",
            "4. Check authentication middleware consistency",
            "5. Validate database schema field mapping",
            "6. Test with minimal data payload",
            "7. Compare with working automated wishlist creation",
            "8. Add proper error handling and user feedback"
        ]

def main():
    """Generate comprehensive wishlist debug analysis"""
    analyzer = WishlistDebugAnalyzer()
    
    print("🔍 KIMI-DEV WISHLIST DEBUG ANALYSIS")
    print("=" * 50)
    
    # Manual creation flow analysis
    print("\n📋 MANUAL WISHLIST CREATION FLOW ISSUES:")
    flow_issues = analyzer.analyze_manual_wishlist_creation_flow()
    for issue in flow_issues:
        print(f"• {issue['component']}: {issue['issue']} ({issue['severity']})")
        print(f"  Details: {issue['details']}")
    
    # Authentication analysis
    print("\n🔐 AUTHENTICATION ANALYSIS:")
    auth_analysis = analyzer.analyze_authentication_flow()
    for issue in auth_analysis["potential_issues"]:
        print(f"• {issue['issue']}: {issue['details']}")
    
    # Data validation issues
    print("\n📝 DATA VALIDATION ISSUES:")
    validation_issues = analyzer.analyze_data_validation_issues()
    for issue in validation_issues:
        print(f"• {issue['component']}: {issue['issue']} ({issue['severity']})")
        print(f"  Fix: {issue['fix']}")
    
    # Debug plan
    print("\n🔧 SYSTEMATIC DEBUG PLAN:")
    debug_plan = analyzer.generate_systematic_debug_plan()
    for phase, steps in debug_plan.items():
        print(f"\n{phase.replace('_', ' ').title()}:")
        for step in steps:
            print(f"  • {step}")
    
    # Implementation fixes
    print("\n✅ IMPLEMENTATION FIXES:")
    fixes = analyzer.create_implementation_fixes()
    for fix in fixes:
        print(f"  {fix}")
    
    print("\n" + "=" * 50)
    print("KIMI-DEV ANALYSIS COMPLETE")

if __name__ == "__main__":
    main()