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

이미지가 생성되는 동안 UI 상단에 로딩바가 표시되어야 함.  또한 생성이 완료되면 UI 상단에 알림이 표시되어야 함.  생성되는 동안 생성 버튼이 비활성화되어야 함. 

NAI 설정은 처음에는 "NAI 설정"  버튼만 보이고, 버튼을 누르면 동적으로 NaiSettingsPanel.vue 컴포넌트가 표시되어야 함.  설정 완료를 누르면 설정을 저장함. 설정 닫기 버튼을 누르면 다시 패널을 없애고 버튼만 보여야 함. 

컷 내의 삭제 버튼을 누르면 컷이 제거 됨.

시나리오는 지금 당장은 local storage에 저장하고, 불러 오기를 누르면 local storage에 저장된 시나리오목록을 보여주고 선택하면 해당 시나리오를 불러오게 됨. 어플이 기동될떄 마지막 저장된 시나리오를 불러오게 됨.  이미지 생성을 요청하면 우선 시나리오를 저장한 후에 이미지 생성을 요청함. 

"NAI 스토리 이미지 생성기" 어플 제목은 불필요하니 제거. 

NAI 설정 패널 , 시나리오 편집 섹션, 은 가로 30% 부분만 사용. 나머지 70%는 이미지 뷰어 섹션으로 구성됨. 
모바일 환경일때는 이미지 뷰어는 기본적으로 보이지 않음. 설정, 시나리오 편집 섹션만 가득 채워서 보여야 함. 
모바일 환경일때는 섬네일을 1클릭하면 이미지 뷰어가 전체화면으로. 다시 클릭하면 이미지 뷰어가 사라지고 다시 시나리오 편집 섹션으로 돌아감.
이미지 뷰어에 이미지가 표시되고 있을때 더블 클릭 하면 다운로드 버튼이 표시되고, 다시 더블 클릭하면 버튼이 사라짐.  다운로드 버튼을 누르면 이미지가 다운로드됨. 이미지명은 nai_{yyyyMMdd_hhmmss}.png 로 저장됨
이미지 뷰어는 불필요한 버튼이나 글자는 없이, 최대한 비율을 유지한체 섹션을 가득 채워야 함

모바일 환경에서 컷 패널은 제스처로 컷을 좌우로 스크롤 할수 있어야 함. 

새 시나리오를 시작하는 버튼 추가







.  모바일 환경일때는 

썸네일의 크기는 생성 요청중 lanscape 모드일때는 1216 x 832 임을 고려하여 썸네일 이미지의 크기를 결정함. 

# 서버 모듈 
