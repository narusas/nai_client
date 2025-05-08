# 목표 

Novel AI (이후 NAI)에서 여러 컷으로 진행되는 스토리 있는 이미지들을 자동으로 생성 하는 프로그램

# 사용 기술 
Node
Typescript, 
Vue3, 
Pinia, 
Vite, 
Vuetify 3,
axios, 

    
# 기능 


NAI 설정 패널이 최상단이고, 중간에 시나리오 편집 기능이 있고, 하단에 이미지 크게 보기 위한 하단 메인 섹션이 있음. 

하나의 시나리오에 여러 컷이 있음.  컷은 왼쪽에서 오른쪽으로 진행되며 한번에 모두 보여야 함. 동적으로 추가하거나 삭제할 수 있어야 함. 

각 컷은 대표 이미지셕션, NAI의 메인 프롬프트 입력 섹션,  n개의 캐릭터별 프롬프트로 구성됨.  이 프롬프트편집은 아래로 진행되는 text area 들을 이용해 지정됨. 캐릭터 프롬프트 섹션은  동적으로 추가하거나 삭제할 수 있어야 함. 

컷은 숫지를 입력받을수 있음. 여기에 지정된 숫자만큼 이미지를 생성함.  이렇게 생성된 이미지는 컷 단위로 이력을 한번에 보여줄수 있게 수직으로 썸네일이 스크롤 가능하게 늘어 나는 방식으로 . 각 컷 단위로 아래로 스크롤 가능한 셕센을 가져야 함. 해당 섬네일을 클릭하면 컷의 대표 이미지가.  
각 컷은 프롬프트를 지속적으로 수정하며 이미지를 생성할것임. 한번 생성할떄마다 해당 이미지의 프롬프트도 같이 저장해두었다가 섬네일이미지를 더블 클릭하면 해당 이미지의 프롬프트를 가져와서 편집 패널에 채워주어야 함.  

컷 대표 이미지나 이력 썸네일등 어느 이미지를 클릭해도 하단 이미지 뷰어에 해당 이미지가 섹션에 비율을 유지한체 가득 찬 이미지로 보여주어야 함

이미지 생성은 NAI의 API를 사용하여 생성됨. 


생성된 이미지는 파일시스템에 `생성일시/시나리오명/컷명/` 폴더에 저장됨. 


vitejs 의 서버 기능을 이용하여 즉시 실행되는 구조로 서버 모듈을 개발함. 서버모듈은 spa 를 제공하고, 이미지 생성을 요청하는 기능을 가짐. 





이미지 생성은 https://image.novelai.net/docs/index.html#/default/post_ai_generate_image 이 API를 사용하여 생성됨. 

model 4 요청은 다음과 같은 형식임 
```
{"input":"artist:rella, year 2024, \n, no text, best quality, very aesthetic, absurdres","model":"nai-diffusion-4-full","action":"generate","parameters":{"params_version":3,"width":1216,"height":832,"scale":6,"sampler":"k_euler_ancestral","steps":28,"n_samples":1,"ucPreset":0,"qualityToggle":true,"autoSmea":true,"dynamic_thresholding":false,"controlnet_strength":1,"legacy":false,"add_original_image":true,"cfg_rescale":0.8,"noise_schedule":"karras","legacy_v3_extend":false,"skip_cfg_above_sigma":null,"use_coords":true,"legacy_uc":false,"normalize_reference_strength_multiple":true,"seed":2561483728,"characterPrompts":[{"prompt":"boy","uc":"lowres, aliasing, ","center":{"x":0.5,"y":0.5},"enabled":true},{"prompt":"girl","uc":"lowres, aliasing, ","center":{"x":0.5,"y":0.5},"enabled":true}],"v4_prompt":{"caption":{"base_caption":"artist:rella, year 2024, \n, no text, best quality, very aesthetic, absurdres","char_captions":[{"char_caption":"boy","centers":[{"x":0.5,"y":0.5}]},{"char_caption":"girl","centers":[{"x":0.5,"y":0.5}]}]},"use_coords":true,"use_order":true},"v4_negative_prompt":{"caption":{"base_caption":"nsfw, blurry, lowres, error, film grain, scan artifacts, worst quality, bad quality, jpeg artifacts, very displeasing, chromatic aberration, multiple views, logo, too many watermarks, white blank page, blank page","char_captions":[{"char_caption":"lowres, aliasing, ","centers":[{"x":0.5,"y":0.5}]},{"char_caption":"lowres, aliasing, ","centers":[{"x":0.5,"y":0.5}]}]},"legacy_uc":false},"negative_prompt":"nsfw, blurry, lowres, error, film grain, scan artifacts, worst quality, bad quality, jpeg artifacts, very displeasing, chromatic aberration, multiple views, logo, too many watermarks, white blank page, blank page","deliberate_euler_ancestral_bug":false,"prefer_brownian":true}}
```

NAI 설정중 cfg_rescale 는 "CFG" 로 보여주고 0.1 단위로 조작할수 있어야 함

noise_schedule 는 "Noise"라고 보여주고, karras, exponential, polyexponential 중에서 선택할수 있어야 함

scale은 "Guidence"라고 보여주고 0.1 단위로 조작할수 있어야 함. 기본값 6 

Model은 "Model"이라고 보여주고, nai-diffusion-4-full,nai-diffusion-4-curated-preview,nai-diffusion-3 중에서 선택할수 있어야 함

NAI 설정에 "자동 다운로드" 토글 옵션이 있음. 이 옵션이 켜져있으면 이미지가 생성된 후에 자동으로 다운로드됨. 기본값은 false. 

NAI 설정에 "이미지 포멧" 옵션에 "JPG", "PNG" 중에서 선택할수 있어야 함. 기본값은 "JPG". 이 설정은 이미지 다운로드시에 반영 되어야 함. 

이미지가 생성되는 동안 UI 상단에 로딩바가 표시되어야 함.  또한 생성이 완료되면 UI 상단에 알림이 표시되어야 함.  생성되는 동안 생성 버튼이 비활성화되어야 함. 

NAI 설정은 처음에는 "NAI 설정"  버튼만 보이고, 버튼을 누르면 동적으로 NaiSettingsPanel.vue 컴포넌트가 표시되어야 함.  설정 완료를 누르면 설정을 저장함. 설정 닫기 버튼을 누르면 다시 패널을 없애고 버튼만 보여야 함. 

컷 내의 삭제 버튼을 누르면 컷이 제거 됨.

새 시나리오를 시작하는 버튼 추가

시나리오는 indexeddb 에 저장하고, 불러 오기를 누르면 indexeddb에 저장된 시나리오목록을 보여주고 선택하면 해당 시나리오를 불러오게 됨. 어플이 기동될떄 마지막 저장된 시나리오를 불러오게 됨.  

시나리오/컷 이미지 생성을 버튼을 눌러 생성을 우선 시나리오를 저장한 후에 이미지 생성을 요청함. 

이미지가 생성되면 이미지 뷰어는 새로 만들어진 이미지로 갱신.  버튼을 누르자마자 이미지뷰어가 초기회 되지 않고, 최대한 기존 이미지를 보여주다, 새로 생성된 경우에만 갱신. 

"NAI 스토리 이미지 생성기" 어플 제목은 불필요하니 제거. 

NAI 설정 패널 , 시나리오 편집 섹션, 은 가로 30% 부분만 사용. 나머지 70%는 이미지 뷰어 섹션으로 구성됨. 
모바일 환경일때는 이미지 뷰어는 기본적으로 보이지 않음. 설정, 시나리오 편집 섹션만 가득 채워서 보여야 함. 
모바일 환경일때는 섬네일을 1클릭하면 이미지 뷰어가 전체화면으로. 다시 클릭하면 이미지 뷰어가 사라지고 다시 시나리오 편집 섹션으로 돌아감.
모바일 환경이 아닐때는 섬네일을 1클릭하면 이미지 뷰어 전체화면이 토글됨
이미지 뷰어에 이미지가 표시되고 있을때 더블 클릭 하면 다운로드 버튼이 표시되고, 다시 더블 클릭하면 버튼이 사라짐.  다운로드 버튼을 누르면 이미지가 다운로드됨. 이미지명은 nai_{yyyyMMdd_hhmmss}.png 로 저장됨
이미지 뷰어는 불필요한 버튼이나 글자는 없이, 최대한 비율을 유지한체 섹션을 가득 채워야 함. 
중요: 전체 화면 모드일떄는 비율을 유지한체 화면을 가득 채워야 함. 

시나리오 편집 섹션은 아래방향으로 100%로 확장되어야 함. 각 컷 편집섹션은 화면상에는 100% fill 되어야 하고, 넘치는 영역은 위 아래로 스크롤 되어야 함

모바일 환경에서 컷 패널은 제스처로 컷을 좌우로 스크롤 할수 있어야 함. 
모바일 환경에서는 기기의 스크린 방향이 변경되면 이미지 뷰어의 방향도 변경되어야 함. 



이미지 생성 이력 썸네일 목록은 메모리를 적게 쓰기 위해 화면에 표시 되는 이미지만 제한된 img element로 보여주고, 화면에서 넘어가면 img element를 제거함.  일반적인 무한 스크롤 기법을 도입해야 함. 



캐릭터 프롬프트 에디터의 각 항목은 순서를 변경 할수 있어야함. 최상단 캐릭터는 아래로 움직일수 있고, 중간은 위 아래로, 최 하단은 위로 움직일수 있어야 함. 


네거티브 프롬프트는 최근 20개 까지 이력을 관리하고, UI 에 선택 아이콘을 누르면 과거 이력을 보고 선택한 네거티브 이력을 메인/캐릭터 프롬프트 에디터로 복사 할수 있어야 함. 이렇게 과거에서 선택하면 해당 이력은 가장 최근 이력이 되어야 함.

컷 이미지 이력이 있을때 이미지가 클릭되어 전체 화면이 되었을때는, 좌우 제스처로 이력내에서 이미지를 순회 할수 있어야 함.  닫기 터치 이벤트가 겹치는데 이문제를 해결해줘 .

.  모바일 환경일때는 

썸네일의 크기는 생성 요청중 lanscape 모드일때는 1216 x 832 임을 고려하여 썸네일 이미지의 크기를 결정함. 

썸네일에 하단에 회색 바탕에 하얀 숫자가 나오는데 공간 낭비임. 썸네일 하나가 한줄을 차지하고 썸네일 목록만 별도의 스크롤이 되어야함 

컷에서 대표 이미지로 지정된 이미지는 indexed db에 저장해 두었다가 어플 재기동후, 시나리오 로딩시에 가져와서 기본 이미지로 사용 


대표 이미지를 재외한 다른 이미지는 리프레시로 어플 재기동 되면 사라짐. 

컷에 이미지가 최초로 만들어지면 대표 이미지이고, 마지막 남은 이미지도 대표 이미지임


컷 목록의 가로 스크롤바를 상단에

이미지 생성시 컷에 지정된 이미지 숫자만큼 이미지를 생성.

시나리오 레벨에서 이미지 생성 버튼을 제공하고 해당 버튼은 모든 컷에 대해 이미지 생성을 요청함.  이떄 각 컷은 지정된 이미지 갯수만큼 생성.  각 컷을 진행할떄는 해당 컷이 스크롤 되어서 보이는 상태로 만들것. 상단에 총 몇장을 생성해야 하고 현재 몇장까지 생성되었는지 숫자로 알려주는 표시.  그 옆에 취소 버튼  
모든 생성 작업중에는 ESC를 눌러서 중지할수 있어야 함.  모바일에서는 취소 버튼알 상단에 노출. 



컷 목록 은 가로 스크롤로 구성됨.  따라서 편집 섹션의 세로 스크롤은 컷 내용이어야 하고, 컷만 따로 세로 스크롤 하는게 아님

각 프롬프트는 (메인/캐릭터) N개의 서브 프롬프트 목록으로 구성됨. 서브 프롬프트가 프롬프트, 네거티브 프롬프트로 구성됨 

```
시나리오 
   -- 기본 정보 및 버튼들
   -- 선행 프롬프트
      -- 프롬프트 아이템(1~N개)
         -- 프롬프트
         -- 네거티브 프롬프트
         -- 확률
   
   -- 후행 프롬프트 
      -- 프롬프트 아이템(1~N개)
         -- 프롬프트
         -- 네거티브 프롬프트
         -- 확률
 
   -- 컷 
      -- 대표 이미지 패널 
         -- 대표 이미지
         -- 과거 생성 이미지 목록 썸네일
      -- 컷 기본 정보 및 버튼목록
      -- 해상도 선택 패널   
      -- 메인 프롬프트 (1개만 있음)
         -- 프롬프트 아이템(1~N개)
            -- 프롬프트
            -- 네거티브 프롬프트
            -- 확률
      --캐릭터 프롬프트 (0~N개)
         -- 프롬프트 아이템(1~N개)
            -- 프롬프트
            -- 네거티브 프롬프트
            -- 확률
    
```
해상도 선택 패널은 여러 해상도를 선택해서 목록에 추가/삭제 할수 있음.  해상도는 1216 x 832  ,832 x 1216, 1024 x 1024를 콤보 박스에서 선택해서 추가 하거나, 커스텀 해상도를 (최대 픽셀수는  1216 x 832 이내에서) 입력받아 선택된 해상도 목록에  추가할수 있음. 
해상도 목록은 각각 랜덤 선택되며, 해상도간의 확률을 지정할수 있음. 총 합이 100% 여야 함. 
해상도 선택 패널은 컷이 생성될때 선택된 해상도를 컷의 해상도로 사용함. 
최초에는 1216 x 832 해상도가 기본으로 설정됨.  


각 프롬프트/네거티브 프롬프트는 모두 50개 까지 이력관리가 되며, 이력 버튼을 눌러 과거 내용을 복사하여 사용할수 있음 
각 서브 프롬프트에는 0~100 % 사이의 확률이 지정되어 이미지 생성시에 해당 서브프롬프트 포함여부가 확률로 결정됨. 기본값은 100%

이미지 생성시에는 서브 프롬프트들을 종합하여 NAI API 요청에 포함시킴. 

컷 하위 프롬프트 간에 구분이 쉽도록 시작적 경계를 추가
메인 프롬프트와 각 캐릭터 프롬프트 간에도 시각적 경계 추가
컷 하위 프롬프트 편집 영역 전체를 토글로 구성해서 과거 이미지를 더 중심적으로 볼수 있게 해줘 


시나리오는 000001부터 시작하는 고유번호를 가짐.  각 컷은 01 부터 시작하는 시나리오내 고유 번호를 가짐. 컷은 시나리오 내에서만 유효함. 컷의 이름이 변경되도 고유번호는 유지됨. 
각 이미지는 000001부터 시작하는 고유번호를 가짐.  
이미지 다운로드시 이미지는 nai_{시나리오고유번호}_{컷고유번호}_{이미지고유번호}.{이미지포맷} 이란 이름으로 저장됨. 
또한 img 태그에 해당 이름으로 src 속성을 지정함.  그래서 우클릭 저장할때도 항상 고유한 이미지로 저장될수 있음. 이미지 뷰어든, 섬네일이미지든 모두 마찬가지로 src 속성을 지정함 



현재 파일명 형식: nai_{scenarioId}_{cutId}_{imageId}.{imageFormat} (여기서 ID들은 UUID 형태)

새로운 파일명 형식: nai_{간단한ScenarioId}_{cutIndex}_{타임스탬프}.{imageFormat}

간단한ScenarioId: 기존 scenarioId (UUID)의 앞 10자리 사용
cutIndex: 컷의 배열 인덱스 (0부터 시작, 2자리 숫자로 표현 - 예: 01, 02, 10)
타임스탬프: yyyyMMdd_HHmmss 형식 (예: 20250507_181048)




배포는 github pages를 사용하여 배포할것임. 저장소는   https://github.com/narusas/nai_client

페이지 접근은 https://narusas.github.io/nai_client/


시나리오 편집영역 전체화면 토글 버튼
NAI 설정 요약
   모델명
   샘플러
   Steps
   CFG
   Guidence 




