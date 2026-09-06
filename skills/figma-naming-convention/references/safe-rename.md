# Safe Rename Protocol

Figma 요소의 이름을 안전하게 변경하는 절차

## 목표

1. **무손실**: 파일 구조, 시각적 요소, 기능 보존
2. **추적 가능**: 모든 변경 사항 기록
3. **복구 가능**: 문제 발생 시 롤백 가능
4. **투명성**: 사용자에게 명확한 변경 내용 제공

## 1. 사전 검증

### 편집 권한 확인

```javascript
// use_figma 실행 전 확인
async function checkEditAccess(fileKey) {
  try {
    const result = await useFigma(`
      return {
        mutatedNodeIds: [],
        hasAccess: true,
        fileName: figma.root.name
      };
    `, fileKey);
    
    return result.hasAccess;
  } catch (error) {
    if (error.message.includes('edit access')) {
      return false;
    }
    throw error;
  }
}
```

### 노드 존재 확인

```javascript
async function verifyNodes(fileKey, nodeIds) {
  const script = 'const results = []; const nodeIds = ' + JSON.stringify(nodeIds) + '; for (const nodeId of nodeIds) { const node = figma.getNodeById(nodeId); results.push({ nodeId, exists: node !== null, name: node?.name || null, type: node?.type || null, locked: node?.locked || false }); } return { mutatedNodeIds: [], nodes: results };';
  
  return await useFigma(script, fileKey);
}
```

## 2. 변경 계획 생성

### 변경 항목 구조

```javascript
{
  "nodeId": "1:234",
  "oldName": "button primary",
  "newName": "ButtonPrimary",
  "type": "COMPONENT",
  "reason": "Apply PascalCase convention",
  "risk": "low" // low, medium, high
}
```

### 위험도 평가

```javascript
function assessRisk(node, newName) {
  let risk = 'low';
  const reasons = [];
  
  // Published component
  if (node.type === 'COMPONENT' && node.remote) {
    risk = 'high';
    reasons.push('Published component - may affect other files');
  }
  
  // Main component in library
  if (node.type === 'COMPONENT_SET' && node.remote) {
    risk = 'high';
    reasons.push('Component set in library');
  }
  
  // 이름 변경 폭이 큼
  const similarity = calculateSimilarity(node.name, newName);
  if (similarity < 0.5) {
    risk = risk === 'high' ? 'high' : 'medium';
    reasons.push('Significant name change');
  }
  
  // 외부 라이브러리
  if (node.type === 'INSTANCE' && node.mainComponent?.remote) {
    risk = 'medium';
    reasons.push('Instance of external component');
  }
  
  return { risk, reasons };
}

function calculateSimilarity(str1, str2) {
  // Levenshtein distance 기반 유사도
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;
  
  if (longer.length === 0) return 1.0;
  
  const editDistance = levenshteinDistance(longer, shorter);
  return (longer.length - editDistance) / longer.length;
}
```

## 3. 배치 처리 전략

### 청크 단위 처리

```javascript
async function applyChangesInBatches(fileKey, changes, batchSize = 50) {
  const results = {
    applied: [],
    skipped: [],
    failed: []
  };
  
  for (let i = 0; i < changes.length; i += batchSize) {
    const batch = changes.slice(i, i + batchSize);
    
    try {
      const batchResult = await applyBatch(fileKey, batch);
      results.applied.push(...batchResult.applied);
      results.skipped.push(...batchResult.skipped);
      results.failed.push(...batchResult.failed);
    } catch (error) {
      const batchNum = i / batchSize + 1;
      console.error('Batch ' + batchNum + ' failed:', error);
      results.failed.push(...batch.map(c => ({
        ...c,
        error: error.message
      })));
    }
    
    // Rate limiting 방지
    if (i + batchSize < changes.length) {
      await sleep(1000); // 1초 대기
    }
  }
  
  return results;
}
```

### 단일 배치 적용

```javascript
async function applyBatch(fileKey, changes) {
  const script = 'const changes = ' + JSON.stringify(changes) + '; const results = { applied: [], skipped: [], failed: [], mutatedNodeIds: [] }; for (const change of changes) { try { const node = figma.getNodeById(change.nodeId); if (!node) { results.skipped.push(Object.assign({}, change, { reason: "Node not found" })); continue; } if (node.name !== change.oldName) { results.skipped.push(Object.assign({}, change, { reason: "Name mismatch: expected " + change.oldName + ", got " + node.name })); continue; } if (node.locked) { results.skipped.push(Object.assign({}, change, { reason: "Node is locked" })); continue; } const oldName = node.name; node.name = change.newName; results.applied.push({ nodeId: change.nodeId, oldName: oldName, newName: node.name, type: node.type }); results.mutatedNodeIds.push(node.id); } catch (error) { results.failed.push(Object.assign({}, change, { error: error.message })); } } return results;';
  
  return await useFigma(script, fileKey);
}
```

## 4. 검증

### 변경 후 확인

```javascript
async function verifyChanges(fileKey, appliedChanges) {
  const script = 'const changes = ' + JSON.stringify(appliedChanges) + '; const verification = []; for (const change of changes) { const node = figma.getNodeById(change.nodeId); verification.push({ nodeId: change.nodeId, expectedName: change.newName, actualName: node?.name || null, success: node?.name === change.newName, exists: node !== null }); } return { mutatedNodeIds: [], verification: verification };';
  
  const result = await useFigma(script, fileKey);
  
  const failures = result.verification.filter(v => !v.success);
  
  return {
    totalVerified: result.verification.length,
    successful: result.verification.length - failures.length,
    failed: failures.length,
    failures
  };
}
```

## 5. 롤백 메커니즘

### 변경 이력 저장

```javascript
const changeHistory = {
  fileKey: 'abc123',
  timestamp: Date.now(),
  changes: [
    {
      nodeId: '1:234',
      oldName: 'button primary',
      newName: 'ButtonPrimary',
      applied: true
    }
  ]
};
```

### 롤백 실행

```javascript
async function rollback(fileKey, changeHistory) {
  const rollbackChanges = changeHistory.changes
    .filter(c => c.applied)
    .map(c => ({
      nodeId: c.nodeId,
      oldName: c.newName, // 현재 이름
      newName: c.oldName  // 원래 이름으로 복원
    }));
  
  return await applyChangesInBatches(fileKey, rollbackChanges);
}
```

## 6. 특수 케이스 처리

### Published Component

```javascript
async function handlePublishedComponent(node, newName) {
  // 경고 메시지
  const warning = {
    type: 'published_component',
    message: '"' + node.name + '" is a published component. Renaming it may affect other files that use this component.',
    nodeId: node.id,
    currentName: node.name,
    proposedName: newName,
    action: 'require_confirmation'
  };
  
  return warning;
}
```

### Component Variant

```javascript
async function handleComponentVariant(node) {
  // Component variant의 이름은 property 값으로 결정됨
  // 직접 이름 변경 불가, property 변경 필요
  
  const warning = {
    type: 'component_variant',
    message: '"' + node.name + '" is a component variant. Its name is determined by variant properties and cannot be renamed directly.',
    nodeId: node.id,
    action: 'skip'
  };
  
  return warning;
}
```

### External Library Instance

```javascript
async function handleExternalInstance(node) {
  // 외부 라이브러리의 instance는 이름 변경 가능
  // 하지만 main component 이름과 혼동 주의
  
  const info = {
    type: 'external_instance',
    message: '"' + node.name + '" is an instance of an external component. Renaming is allowed but may cause confusion.',
    nodeId: node.id,
    mainComponentName: node.mainComponent?.name || 'Unknown',
    action: 'warn'
  };
  
  return info;
}
```

## 7. 에러 처리

### 일반적인 에러

```javascript
const errorHandlers = {
  'Node not found': (change) => ({
    ...change,
    action: 'skip',
    reason: 'Node may have been deleted'
  }),
  
  'Node is locked': (change) => ({
    ...change,
    action: 'skip',
    reason: 'Unlock the node first'
  }),
  
  'Name mismatch': (change) => ({
    ...change,
    action: 'skip',
    reason: 'Node name has changed since analysis'
  }),
  
  'No edit access': (change) => ({
    ...change,
    action: 'abort',
    reason: 'File requires edit permission'
  })
};
```

### 부분 실패 처리

```javascript
function handlePartialFailure(results) {
  const { applied, skipped, failed } = results;
  
  if (failed.length > 0) {
    console.warn(failed.length + ' changes failed:');
    failed.forEach(f => {
      console.warn('- ' + f.nodeId + ': ' + f.error);
    });
  }
  
  if (skipped.length > 0) {
    console.info(skipped.length + ' changes skipped:');
    skipped.forEach(s => {
      console.info('- ' + s.nodeId + ': ' + s.reason);
    });
  }
  
  return {
    success: applied.length > 0,
    totalAttempted: applied.length + skipped.length + failed.length,
    successful: applied.length,
    skipped: skipped.length,
    failed: failed.length,
    successRate: (applied.length / (applied.length + failed.length) * 100).toFixed(1)
  };
}
```

## 8. 사용자 확인 프로토콜

### 고위험 변경 확인

```javascript
async function confirmHighRiskChanges(highRiskChanges) {
  if (highRiskChanges.length === 0) return true;
  
  const changeList = highRiskChanges.map(c => 
    '- ' + c.oldName + ' → ' + c.newName + ' (' + c.risk.reasons.join(', ') + ')'
  ).join('\n');
  
  const message = 'The following changes are high-risk:\n\n' + changeList + '\n\nDo you want to proceed? (yes/no)';
  
  // 사용자 입력 대기
  const response = await getUserConfirmation(message);
  return response.toLowerCase() === 'yes';
}
```

### 진행 상황 보고

```javascript
function reportProgress(current, total, currentItem) {
  const percentage = (current / total * 100).toFixed(1);
  console.log('[' + current + '/' + total + '] (' + percentage + '%) ' + currentItem.oldName + ' → ' + currentItem.newName);
}
```

## 9. 완전한 워크플로우 예시

```javascript
async function safeRename(fileKey, changes) {
  // 1. 사전 검증
  const hasAccess = await checkEditAccess(fileKey);
  if (!hasAccess) {
    throw new Error('No edit access to file');
  }
  
  const nodeVerification = await verifyNodes(
    fileKey,
    changes.map(c => c.nodeId)
  );
  
  // 2. 위험도 평가
  const assessedChanges = changes.map(change => {
    const node = nodeVerification.nodes.find(n => n.nodeId === change.nodeId);
    const risk = assessRisk(node, change.newName);
    return { ...change, risk };
  });
  
  // 3. 고위험 변경 확인
  const highRisk = assessedChanges.filter(c => c.risk.risk === 'high');
  if (highRisk.length > 0) {
    const confirmed = await confirmHighRiskChanges(highRisk);
    if (!confirmed) {
      return { cancelled: true, reason: 'User declined high-risk changes' };
    }
  }
  
  // 4. 배치 적용
  const results = await applyChangesInBatches(fileKey, assessedChanges);
  
  // 5. 검증
  const verification = await verifyChanges(fileKey, results.applied);
  
  // 6. 결과 보고
  const summary = handlePartialFailure(results);
  
  return {
    ...summary,
    verification,
    changeHistory: {
      fileKey,
      timestamp: Date.now(),
      changes: results.applied
    }
  };
}
```

## 10. 체크리스트

변경 전:
- [ ] 편집 권한 확인
- [ ] 노드 존재 확인
- [ ] 위험도 평가
- [ ] 고위험 변경 사용자 확인

변경 중:
- [ ] 배치 단위 처리
- [ ] 각 노드의 현재 이름 확인
- [ ] Locked 노드 건너뛰기
- [ ] mutatedNodeIds 기록

변경 후:
- [ ] 변경 사항 검증
- [ ] 실패/건너뛴 항목 보고
- [ ] 변경 이력 저장
- [ ] 성공률 계산
