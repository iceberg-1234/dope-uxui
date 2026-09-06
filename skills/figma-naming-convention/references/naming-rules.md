# Naming Convention Rules

Figma 요소별 상세 naming 규칙 정의

## 1. Case Styles

### PascalCase
- 각 단어의 첫 글자를 대문자로
- 공백 없음
- 예: `ButtonPrimary`, `SearchInput`, `NavigationBar`
- **적용 대상**: Component, Component Set, Screen Frame

### camelCase
- 첫 단어는 소문자, 이후 단어는 대문자로 시작
- 공백 없음
- 예: `headerContainer`, `userProfile`, `searchResults`
- **적용 대상**: Container Frame, Group

### kebab-case
- 모두 소문자
- 단어 사이 하이픈(-)
- 예: `icon-search`, `background-rect`, `divider-line`
- **적용 대상**: Icon Layer, Shape Layer, Utility Frame

### Title Case
- 각 단어의 첫 글자를 대문자로
- 공백 유지
- 예: `User Profile`, `Search Results`, `Design System`
- **적용 대상**: Page, Screen Frame (대안)

### snake_case
- 모두 소문자
- 단어 사이 언더스코어(_)
- 예: `user_profile`, `search_input`
- **적용 대상**: 레거시 호환성이 필요한 경우만

## 2. 요소별 규칙

### Component

**기본 규칙**: PascalCase

```
✓ Button
✓ SearchInput
✓ NavigationBar
✓ UserAvatar

✗ button (소문자)
✗ search_input (snake_case)
✗ navigation-bar (kebab-case)
```

**계층 구조 표현**:
```
Option 1: Slash (/)
  - Navigation/Button
  - Form/Input/Text
  - Card/Header/Title

Option 2: Flat with context
  - NavigationButton
  - FormInputText
  - CardHeaderTitle
```

**상태 표현**:
```
✓ ButtonHover
✓ InputDisabled
✓ CheckboxChecked

✗ Button-Hover (하이픈 사용)
✗ button_hover (snake_case)
```

### Component Set

**기본 규칙**: PascalCase, 단수형

```
✓ Button (not Buttons)
✓ Icon (not Icons)
✓ TextField (not TextFields)
```

**Variant Properties**:
- Property 이름: camelCase
- Property 값: lowercase 또는 PascalCase

```
✓ state=default, state=hover, state=disabled
✓ size=small, size=medium, size=large
✓ variant=Primary, variant=Secondary

✗ State=Default (property 대문자)
✗ size=Small (값 불필요한 대문자)
```

### Frame

**Screen Frame**: PascalCase 또는 Title Case

```
✓ LoginScreen
✓ UserProfile
✓ Search Results (Title Case 허용)

✗ login_screen
✗ user-profile
```

**Container Frame**: camelCase

```
✓ headerContainer
✓ contentWrapper
✓ sidebarMenu

✗ HeaderContainer (PascalCase는 Component와 혼동)
✗ header-container
```

**Auto Layout Frame**: 용도에 따라

```
✓ horizontalStack (layout utility)
✓ verticalList (layout utility)
✓ gridContainer (layout utility)
```

### Layer

**Text Layer**: 의미 기반 또는 내용 그대로

```
✓ Title
✓ Body Text
✓ Label
✓ "Welcome to our app" (실제 내용)

✗ text1, text2 (무의미한 번호)
```

**Shape Layer**: kebab-case + type suffix

```
✓ background-rect
✓ divider-line
✓ border-stroke
✓ shadow-ellipse

✗ Rectangle 123 (기본 이름)
✗ shape1 (무의미)
```

**Icon Layer**: kebab-case + icon prefix

```
✓ icon-search
✓ icon-close
✓ icon-menu
✓ icon-arrow-right

✗ search icon (공백)
✗ SearchIcon (PascalCase는 Component용)
```

**Image Layer**: kebab-case + 설명

```
✓ hero-image
✓ product-photo
✓ avatar-placeholder

✗ Image 1
✗ img_001
```

### Page

**기본 규칙**: Title Case

```
✓ Design System
✓ Mobile Screens
✓ Desktop Layouts
✓ Components Library

✗ design-system
✗ mobile_screens
```

### Style

**기본 규칙**: category/subcategory/name (slash hierarchy)

```
Color Styles:
✓ color/primary/red
✓ color/neutral/gray-100
✓ color/semantic/error

Text Styles:
✓ text/heading/large
✓ text/body/regular
✓ text/caption/small

Effect Styles:
✓ effect/shadow/card
✓ effect/blur/background
```

## 3. 특수 규칙

### 약어 처리

**대문자 유지**:
```
✓ HTTPRequest
✓ URLInput
✓ APIResponse
✓ IDCard

✗ HttpRequest
✗ UrlInput
```

**단, 가독성을 위해 예외 허용**:
```
✓ HtmlElement (HTML보다 읽기 쉬움)
✓ JsonData (JSON보다 읽기 쉬움)
```

### 숫자 처리

**끝에 배치, 의미 있는 이름 선호**:
```
✓ ButtonPrimary, ButtonSecondary (의미 기반)
✓ Column1, Column2 (순서가 중요한 경우)

✗ Button1, Button2 (의미 없는 번호)
✗ 1Button (숫자로 시작)
```

### Boolean/상태 표현

**명확한 상태 이름**:
```
✓ ButtonEnabled / ButtonDisabled
✓ CheckboxChecked / CheckboxUnchecked
✓ ModalOpen / ModalClosed

✗ Button1 / Button2 (상태 불명확)
✗ Checkbox (상태 미표시)
```

### 복수형

**Component는 단수형**:
```
✓ Button (component)
✓ ListItem (component)

✗ Buttons
✗ ListItems
```

**Frame/Group은 복수형 허용**:
```
✓ buttonGroup (여러 버튼 포함)
✓ iconSet (여러 아이콘 포함)
```

## 4. 금지 패턴

### 기본 이름 유지 금지

```
✗ Rectangle 123
✗ Frame 456
✗ Group 789
✗ Component 1
✗ Text
```

### 무의미한 번호

```
✗ Button1, Button2, Button3
✗ Layer1, Layer2
✗ Frame Copy, Frame Copy 2
```

### 혼재된 스타일

```
✗ Button_Primary (snake_case + PascalCase)
✗ search-Input (kebab-case + PascalCase)
✗ User Profile_Screen (공백 + 언더스코어)
```

### 특수문자

```
✗ Button@Primary
✗ Input#Text
✗ Frame*Container

예외: 슬래시(/)는 계층 구조 표현에 허용
✓ Navigation/Button
```

## 5. 마이그레이션 전략

### 기존 이름 → 새 이름 변환

```javascript
function convertToNamingConvention(oldName, nodeType) {
  // 1. 기본 이름 제거
  if (/^(Rectangle|Frame|Group|Component|Text)\s*\d*$/.test(oldName)) {
    return null; // 사용자에게 의미 있는 이름 요청
  }
  
  // 2. Case 변환
  switch (nodeType) {
    case 'COMPONENT':
    case 'COMPONENT_SET':
      return toPascalCase(oldName);
    
    case 'FRAME':
      if (isScreenFrame(oldName)) {
        return toPascalCase(oldName);
      }
      return toCamelCase(oldName);
    
    case 'TEXT':
      return toTitleCase(oldName);
    
    default:
      if (isIcon(oldName)) {
        return 'icon-' + toKebabCase(oldName);
      }
      return toKebabCase(oldName);
  }
}
```

### 점진적 적용

1. **Phase 1**: Component만 정리
2. **Phase 2**: Screen Frame 정리
3. **Phase 3**: Container Frame 정리
4. **Phase 4**: Layer 정리
5. **Phase 5**: Style 정리

## 6. 예외 처리

### 허용되는 예외

- **브랜드 이름**: `iPhone`, `macOS` (공식 표기 유지)
- **기술 용어**: `OAuth2`, `WebGL` (표준 표기 유지)
- **외부 라이브러리**: Material Design 등 외부 디자인 시스템의 원본 이름
- **레거시 호환**: 기존 시스템과의 연동이 필요한 경우

### 예외 표시

```
// SKILL.md의 PROPOSE 단계에서 예외 목록 제공
exceptions: [
  { nodeId: '1:234', name: 'iPhone 14 Pro', reason: 'Brand name' },
  { nodeId: '5:678', name: 'OAuth2Button', reason: 'Technical term' }
]
```
