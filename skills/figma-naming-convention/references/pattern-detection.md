# Pattern Detection Algorithm

기존 Figma 파일에서 naming pattern을 자동으로 감지하는 알고리즘

## 목표

1. 파일에 이미 적용된 naming convention 식별
2. 가장 많이 사용된 패턴을 기준으로 규칙 도출
3. 불일치 사례 수집 및 분류

## 1. 데이터 수집

### 순회 전략

```javascript
async function collectNamingData(fileKey, rootNodeIds = null) {
  const data = {
    components: [],
    componentSets: [],
    frames: [],
    groups: [],
    layers: [],
    pages: []
  };
  
  // use_figma로 전체 순회
  const script = `
    const results = {
      components: [],
      componentSets: [],
      frames: [],
      groups: [],
      layers: [],
      pages: []
    };
    
    function traverse(node, depth = 0) {
      if (depth > 20) return; // 깊이 제한
      
      const entry = {
        id: node.id,
        name: node.name,
        type: node.type,
        parent: node.parent?.id || null
      };
      
      // 타입별 분류
      if (node.type === 'COMPONENT') {
        results.components.push(entry);
      } else if (node.type === 'COMPONENT_SET') {
        results.componentSets.push(entry);
      } else if (node.type === 'FRAME') {
        results.frames.push(entry);
      } else if (node.type === 'GROUP') {
        results.groups.push(entry);
      } else if (node.type === 'PAGE') {
        results.pages.push(entry);
      } else {
        results.layers.push(entry);
      }
      
      // 자식 순회
      if ('children' in node) {
        for (const child of node.children) {
          traverse(child, depth + 1);
        }
      }
    }
    
    // 페이지 순회
    for (const page of figma.root.children) {
      traverse(page);
    }
    
    return {
      mutatedNodeIds: [],
      data: results
    };
  `;
  
  return await useFigma(script, fileKey);
}
```

## 2. 패턴 분석

### Case Style 감지

```javascript
function detectCaseStyle(name) {
  // PascalCase: 첫 글자 대문자, 공백 없음, 단어마다 대문자
  if (/^[A-Z][a-z]+(?:[A-Z][a-z]+)*$/.test(name)) {
    return 'PascalCase';
  }
  
  // camelCase: 첫 글자 소문자, 공백 없음, 단어마다 대문자
  if (/^[a-z]+(?:[A-Z][a-z]+)*$/.test(name)) {
    return 'camelCase';
  }
  
  // kebab-case: 소문자, 하이픈 구분
  if (/^[a-z]+(?:-[a-z]+)*$/.test(name)) {
    return 'kebab-case';
  }
  
  // snake_case: 소문자, 언더스코어 구분
  if (/^[a-z]+(?:_[a-z]+)*$/.test(name)) {
    return 'snake_case';
  }
  
  // Title Case: 각 단어 첫 글자 대문자, 공백 구분
  if (/^[A-Z][a-z]+(?:\s[A-Z][a-z]+)*$/.test(name)) {
    return 'Title Case';
  }
  
  // UPPER_CASE: 모두 대문자, 언더스코어 구분
  if (/^[A-Z]+(?:_[A-Z]+)*$/.test(name)) {
    return 'UPPER_CASE';
  }
  
  // Mixed: 여러 스타일 혼재
  return 'Mixed';
}
```

### 구분자 감지

```javascript
function detectSeparator(name) {
  const separators = {
    slash: (name.match(/\//g) || []).length,
    hyphen: (name.match(/-/g) || []).length,
    underscore: (name.match(/_/g) || []).length,
    space: (name.match(/\s/g) || []).length
  };
  
  const max = Math.max(...Object.values(separators));
  if (max === 0) return 'none';
  
  return Object.keys(separators).find(k => separators[k] === max);
}
```

### 접두사/접미사 패턴 감지

```javascript
function detectAffixes(names) {
  const prefixes = {};
  const suffixes = {};
  
  for (const name of names) {
    // 접두사 추출 (첫 단어 또는 하이픈/언더스코어 앞)
    const prefixMatch = name.match(/^([a-z]+)[-_]/i);
    if (prefixMatch) {
      const prefix = prefixMatch[1].toLowerCase();
      prefixes[prefix] = (prefixes[prefix] || 0) + 1;
    }
    
    // 접미사 추출 (마지막 단어 또는 하이픈/언더스코어 뒤)
    const suffixMatch = name.match(/[-_]([a-z]+)$/i);
    if (suffixMatch) {
      const suffix = suffixMatch[1].toLowerCase();
      suffixes[suffix] = (suffixes[suffix] || 0) + 1;
    }
  }
  
  // 빈도 높은 접두사/접미사 반환
  const sortedPrefixes = Object.entries(prefixes)
    .sort((a, b) => b[1] - a[1])
    .filter(([_, count]) => count >= 3); // 최소 3회 이상
  
  const sortedSuffixes = Object.entries(suffixes)
    .sort((a, b) => b[1] - a[1])
    .filter(([_, count]) => count >= 3);
  
  return {
    prefixes: sortedPrefixes.map(([prefix, count]) => ({ prefix, count })),
    suffixes: sortedSuffixes.map(([suffix, count]) => ({ suffix, count }))
  };
}
```

### 계층 구조 패턴 감지

```javascript
function detectHierarchyPattern(names) {
  const slashHierarchy = names.filter(n => n.includes('/')).length;
  const flatNaming = names.filter(n => !n.includes('/')).length;
  
  if (slashHierarchy > flatNaming * 0.3) {
    // 30% 이상이 슬래시 사용 → 계층 구조 선호
    return {
      type: 'hierarchical',
      separator: '/',
      examples: names.filter(n => n.includes('/')).slice(0, 5)
    };
  }
  
  return {
    type: 'flat',
    examples: names.slice(0, 5)
  };
}
```

## 3. 통계 분석

```javascript
function analyzePatterns(data) {
  const analysis = {
    components: analyzeGroup(data.components),
    frames: analyzeGroup(data.frames),
    layers: analyzeGroup(data.layers),
    pages: analyzeGroup(data.pages)
  };
  
  return analysis;
}

function analyzeGroup(items) {
  if (items.length === 0) {
    return { count: 0, patterns: {} };
  }
  
  const names = items.map(item => item.name);
  const caseStyles = {};
  const separators = {};
  
  for (const name of names) {
    // Case style 집계
    const caseStyle = detectCaseStyle(name);
    caseStyles[caseStyle] = (caseStyles[caseStyle] || 0) + 1;
    
    // Separator 집계
    const separator = detectSeparator(name);
    separators[separator] = (separators[separator] || 0) + 1;
  }
  
  // 가장 많이 사용된 패턴
  const dominantCase = Object.entries(caseStyles)
    .sort((a, b) => b[1] - a[1])[0];
  
  const dominantSeparator = Object.entries(separators)
    .sort((a, b) => b[1] - a[1])[0];
  
  // 접두사/접미사 분석
  const affixes = detectAffixes(names);
  
  // 계층 구조 분석
  const hierarchy = detectHierarchyPattern(names);
  
  return {
    count: items.length,
    caseStyles,
    separators,
    dominant: {
      case: dominantCase ? dominantCase[0] : null,
      casePercentage: dominantCase ? (dominantCase[1] / items.length * 100).toFixed(1) : 0,
      separator: dominantSeparator ? dominantSeparator[0] : null
    },
    affixes,
    hierarchy,
    samples: names.slice(0, 10)
  };
}
```

## 4. 불일치 감지

### 기본 이름 감지

```javascript
function isDefaultName(name, type) {
  const defaultPatterns = [
    /^Rectangle\s*\d*$/,
    /^Frame\s*\d*$/,
    /^Group\s*\d*$/,
    /^Component\s*\d*$/,
    /^Text\s*\d*$/,
    /^Ellipse\s*\d*$/,
    /^Vector\s*\d*$/,
    /^Line\s*\d*$/,
    /^Polygon\s*\d*$/,
    /^Star\s*\d*$/,
    /^Image\s*\d*$/
  ];
  
  return defaultPatterns.some(pattern => pattern.test(name));
}
```

### Copy 패턴 감지

```javascript
function isCopyName(name) {
  return /\s+Copy(\s+\d+)?$/.test(name);
}
```

### 불일치 분류

```javascript
function detectInconsistencies(items, dominantPattern) {
  const inconsistencies = [];
  
  for (const item of items) {
    const issues = [];
    
    // 기본 이름
    if (isDefaultName(item.name, item.type)) {
      issues.push({
        type: 'default_name',
        severity: 'high',
        message: 'Using default Figma name'
      });
    }
    
    // Copy 패턴
    if (isCopyName(item.name)) {
      issues.push({
        type: 'copy_name',
        severity: 'high',
        message: 'Contains "Copy" suffix'
      });
    }
    
    // Case style 불일치
    const caseStyle = detectCaseStyle(item.name);
    if (caseStyle !== dominantPattern.case && caseStyle !== 'Mixed') {
      issues.push({
        type: 'case_mismatch',
        severity: 'medium',
        message: 'Using ' + caseStyle + ' instead of ' + dominantPattern.case,
        expected: dominantPattern.case,
        actual: caseStyle
      });
    }
    
    // Mixed case (여러 스타일 혼재)
    if (caseStyle === 'Mixed') {
      issues.push({
        type: 'mixed_case',
        severity: 'medium',
        message: 'Mixed case styles in single name'
      });
    }
    
    if (issues.length > 0) {
      inconsistencies.push({
        nodeId: item.id,
        name: item.name,
        type: item.type,
        issues
      });
    }
  }
  
  return inconsistencies;
}
```

## 5. 규칙 도출

```javascript
function deriveConvention(analysis) {
  const convention = {};
  
  // Component 규칙
  if (analysis.components.count > 0) {
    const comp = analysis.components;
    convention.component = {
      case: comp.dominant.case || 'PascalCase',
      separator: comp.dominant.separator || 'none',
      hierarchy: comp.hierarchy.type,
      confidence: comp.dominant.casePercentage
    };
  }
  
  // Frame 규칙
  if (analysis.frames.count > 0) {
    const frame = analysis.frames;
    convention.frame = {
      case: frame.dominant.case || 'camelCase',
      separator: frame.dominant.separator || 'none',
      confidence: frame.dominant.casePercentage
    };
  }
  
  // Layer 규칙
  if (analysis.layers.count > 0) {
    const layer = analysis.layers;
    convention.layer = {
      case: layer.dominant.case || 'kebab-case',
      separator: layer.dominant.separator || 'hyphen',
      confidence: layer.dominant.casePercentage
    };
  }
  
  // Page 규칙
  if (analysis.pages.count > 0) {
    const page = analysis.pages;
    convention.page = {
      case: page.dominant.case || 'Title Case',
      separator: page.dominant.separator || 'space',
      confidence: page.dominant.casePercentage
    };
  }
  
  return convention;
}
```

## 6. 신뢰도 평가

```javascript
function evaluateConfidence(analysis) {
  const scores = [];
  
  for (const [category, data] of Object.entries(analysis)) {
    if (data.count === 0) continue;
    
    const percentage = parseFloat(data.dominant.casePercentage);
    
    let confidence;
    if (percentage >= 80) {
      confidence = 'high'; // 80% 이상 일관성
    } else if (percentage >= 60) {
      confidence = 'medium'; // 60-80% 일관성
    } else {
      confidence = 'low'; // 60% 미만
    }
    
    scores.push({
      category,
      percentage,
      confidence,
      recommendation: percentage < 60 ? 'apply_standard' : 'use_existing'
    });
  }
  
  return scores;
}
```

## 7. 출력 형식

```javascript
{
  "summary": {
    "totalElements": 1234,
    "components": 89,
    "frames": 156,
    "layers": 945,
    "pages": 5
  },
  "detectedPatterns": {
    "component": {
      "case": "PascalCase",
      "confidence": "high",
      "percentage": 87.6,
      "samples": ["Button", "SearchInput", "NavigationBar"]
    },
    "frame": {
      "case": "camelCase",
      "confidence": "medium",
      "percentage": 65.3,
      "samples": ["headerContainer", "contentWrapper"]
    }
  },
  "inconsistencies": [
    {
      "nodeId": "1:234",
      "name": "Rectangle 123",
      "type": "RECTANGLE",
      "issues": [
        {
          "type": "default_name",
          "severity": "high",
          "message": "Using default Figma name"
        }
      ]
    }
  ],
  "recommendation": {
    "strategy": "use_existing", // or "apply_standard"
    "convention": {
      "component": "PascalCase",
      "frame": "camelCase",
      "layer": "kebab-case",
      "page": "Title Case"
    }
  }
}
```

## 8. 사용 예시

```javascript
// 1. 데이터 수집
const data = await collectNamingData(fileKey);

// 2. 패턴 분석
const analysis = analyzePatterns(data.data);

// 3. 규칙 도출
const convention = deriveConvention(analysis);

// 4. 신뢰도 평가
const confidence = evaluateConfidence(analysis);

// 5. 불일치 감지
const inconsistencies = detectInconsistencies(
  data.data.components,
  analysis.components.dominant
);

// 6. 사용자에게 보고
return {
  analysis,
  convention,
  confidence,
  inconsistencies
};
```
