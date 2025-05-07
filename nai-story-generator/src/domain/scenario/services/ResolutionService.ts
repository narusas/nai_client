import { ResolutionSetting } from '../entities/ResolutionSetting';

export class ResolutionService {
  /**
   * 특정 해상도 설정의 확률을 업데이트하고, 활성화된 다른 해상도들의 확률을 재조정합니다.
   * @param resolutions 현재 해상도 설정 목록
   * @param resolutionIdToChange 확률을 변경할 해상도의 ID
   * @param newProbability 새로운 확률 값 (0-100)
   * @returns 업데이트된 해상도 설정 목록
   */
  public static updateResolutionProbability(
    resolutions: ResolutionSetting[],
    resolutionIdToChange: string,
    newProbability: number
  ): ResolutionSetting[] {
    const updatedResolutions = resolutions.map(r => ({ ...r })); // 원본 불변성 유지
    const targetResolution = updatedResolutions.find(r => r.id === resolutionIdToChange);

    if (!targetResolution) {
      console.warn(`ResolutionService: ID '${resolutionIdToChange}'에 해당하는 해상도를 찾을 수 없습니다.`);
      console.log('[ResolutionService.updateResolutionProbability] targetResolution not found, returning:', JSON.parse(JSON.stringify(updatedResolutions)));
      return updatedResolutions;
    }

    const clampedNewProbability = Math.max(0, Math.min(100, Math.round(newProbability)));

    if (!targetResolution.enabled) {
      // 비활성화된 해상도는 확률 값만 변경, 다른 해상도 재조정 없음
      targetResolution.probability = clampedNewProbability;
      console.log('[ResolutionService.updateResolutionProbability] targetResolution disabled, returning:', JSON.parse(JSON.stringify(updatedResolutions)));
      return updatedResolutions;
    }

    // 활성화된 해상도의 확률 변경이므로, 재조정 필요
    targetResolution.probability = clampedNewProbability; // 먼저 변경된 해상도에 새 확률 적용
    console.log(`[ResolutionService.updateResolutionProbability] Calling _rebalanceProbabilities for ${resolutionIdToChange} with probability ${clampedNewProbability}`);
    const result = ResolutionService._rebalanceProbabilities(updatedResolutions, resolutionIdToChange);
    console.log('[ResolutionService.updateResolutionProbability] after _rebalanceProbabilities, returning:', JSON.parse(JSON.stringify(result)));
    return result;
  }

  /**
   * 특정 해상도 설정의 활성화 상태를 토글하고, 필요시 확률을 재조정합니다.
   * @param resolutions 현재 해상도 설정 목록
   * @param resolutionIdToToggle 활성화 상태를 변경할 해상도의 ID
   * @param isEnabled 새로운 활성화 상태
   * @returns 업데이트된 해상도 설정 목록
   */
  public static toggleResolutionEnabled(
    resolutions: ResolutionSetting[],
    resolutionIdToToggle: string,
    isEnabled: boolean
  ): ResolutionSetting[] {
    const updatedResolutions = resolutions.map(r => ({ ...r })); // 원본 불변성 유지
    const targetResolution = updatedResolutions.find(r => r.id === resolutionIdToToggle);

    if (!targetResolution) {
      console.warn(`ResolutionService: ID '${resolutionIdToToggle}'에 해당하는 해상도를 찾을 수 없습니다.`);
      return updatedResolutions;
    }

    if (targetResolution.enabled === isEnabled) {
      return updatedResolutions; // 변경 없음
    }

    targetResolution.enabled = isEnabled;

    // 활성화 상태가 변경되었으므로, 전체 활성 해상도에 대해 재조정
    // _rebalanceProbabilities는 resolutionIdToToggle를 기준으로 나머지 활성 해상도들의 합이 100%가 되도록 조정함.
    // 이 때 resolutionIdToToggle의 probability는 이미 설정된 값을 사용.
    return ResolutionService._rebalanceProbabilities(updatedResolutions, resolutionIdToToggle);
  }

  /**
   * 새로운 해상도 설정을 목록에 추가하고, 필요시 확률을 재조정합니다.
   * @param cut 현재 Cut 객체
   * @param newResolution 추가할 새로운 해상도 설정 (id와 초기 probability 포함되어야 함)
   * @returns 업데이트된 Cut 객체
   */
  public static addResolution(
    cut: any,
    newResolution: ResolutionSetting
  ): any {
    let currentResolutions = cut.selectedResolutions ? [...cut.selectedResolutions] : [];

    // ID 충돌 방지 (이미 ScenarioUseCases에서 ID를 부여하지만, 안전장치)
    if (currentResolutions.some(r => r.id === newResolution.id)) {
      console.warn(`ResolutionService: ID '${newResolution.id}'를 가진 해상도가 이미 존재합니다. 추가하지 않습니다.`);
      return cut; 
    }

    // newResolution의 probability가 0-100 범위인지 확인 및 보정
    newResolution.probability = Math.max(0, Math.min(100, Math.round(newResolution.probability || 0)));

    currentResolutions.push(newResolution);

    if (newResolution.enabled) {
      // 새로 추가된 활성 해상도를 기준으로 재조정
      const adjustedResolutions = ResolutionService.adjustProbabilities(currentResolutions, newResolution.id, newResolution.enabled);
      return {
        ...cut,
        selectedResolutions: adjustedResolutions,
      };
    } else {
      // 비활성화된 해상도로 추가된 경우, 다른 해상도 확률에 영향 없음
      return {
        ...cut,
        selectedResolutions: currentResolutions,
      };
    }
  }

  /**
   * 특정 해상도 설정을 목록에서 제거하고, 필요시 확률을 재조정합니다.
   * @param resolutions 현재 해상도 설정 목록
   * @param resolutionIdToRemove 제거할 해상도의 ID
   * @returns 업데이트된 해상도 설정 목록
   */
  public static removeResolution(
    resolutions: ResolutionSetting[],
    resolutionIdToRemove: string
  ): ResolutionSetting[] {
    const initialLength = resolutions.length;
    let updatedResolutions = resolutions.filter(r => r.id !== resolutionIdToRemove);

    if (updatedResolutions.length === initialLength) {
      console.warn(`ResolutionService: ID '${resolutionIdToRemove}'에 해당하는 해상도를 찾을 수 없어 제거하지 못했습니다.`);
      return resolutions;
    }
    
    updatedResolutions = updatedResolutions.map(r => ({...r})); // 필터링 후 남은 배열도 복사본으로 만듦

    // 해상도 제거 후, 활성화된 해상도가 있다면 재조정 필요.
    // _rebalanceProbabilities는 특정 ID를 기준으로 하지만, 제거된 경우는 기준 ID가 없음.
    // 이 경우, 첫 번째 활성 해상도를 기준으로 삼거나, mainChangedId 없이 호출할 수 있도록 _rebalanceProbabilities 수정 필요.
    // 현재 _rebalanceProbabilities는 mainChangedId가 필수.
    // 가장 간단하게는, 남아있는 활성 해상도 중 첫번째 것을 mainChangedId로 사용.
    const firstActive = updatedResolutions.find(r => r.enabled);
    if (firstActive) {
      return ResolutionService._rebalanceProbabilities(updatedResolutions, firstActive.id);
    } else {
      // 활성 해상도가 없으면 재조정 불필요
      return updatedResolutions;
    }
  }

  /**
   * 활성화된 해상도들 간의 확률을 재분배하여 총합 100%를 맞춥니다.
   * @param resolutions 현재 해상도 설정 목록 (이미 변경된 해상도의 확률/활성상태는 반영된 상태여야 함)
   * @param mainChangedId 최근 확률 또는 활성 상태가 변경된 해상도의 ID. 이 해상도는 조정에서 특별한 기준점이 될 수 있음.
   * @returns 확률이 재조정된 해상도 설정 목록
   * @private
   */
  private static _rebalanceProbabilities(
    resolutions: ResolutionSetting[],
    mainChangedId: string // 이 ID를 가진 해상도를 기준으로 다른 해상도들을 조정
  ): ResolutionSetting[] {
    console.log('[_rebalanceProbabilities] Input resolutions:', JSON.parse(JSON.stringify(resolutions)));
    console.log('[_rebalanceProbabilities] Input mainChangedId:', mainChangedId);

    const activeResolutions = resolutions.filter(r => r.enabled);
    if (activeResolutions.length === 0) {
      console.log('[_rebalanceProbabilities] No active resolutions, returning original resolutions.');
      return resolutions;
    }

    const mainRes = activeResolutions.find(r => r.id === mainChangedId);
    // mainRes가 없거나 비활성화된 경우 (toggleResolutionEnabled에서 비활성화 시) mainChangedId는 activeResolutions에 없을 수 있음.
    // 이 경우 모든 activeResolutions이 조정 대상이 됨.
    const otherActiveResolutions = mainRes 
      ? activeResolutions.filter(r => r.id !== mainChangedId)
      : [...activeResolutions]; // mainRes가 없으면 모든 activeResolutions이 other가 됨 (사실상 균등 분배)

    // 1. 조정 전, mainRes를 제외한 활성 해상도들의 확률 총합 계산
    // mainRes의 확률은 사용자가 지정한 값으로 간주하고, 이를 기준으로 나머지를 100%에 맞춤.
    let sumOfOthers = otherActiveResolutions.reduce((sum, r) => sum + r.probability, 0);
    let targetSumForOthers = mainRes ? 100 - mainRes.probability : 100;
    // targetSumForOthers가 음수가 될 수 있으므로, 0 이상으로 보정. mainRes.probability가 100을 초과한 경우 등.
    targetSumForOthers = Math.max(0, targetSumForOthers);

    let diffForOthers = targetSumForOthers - sumOfOthers;

    if (otherActiveResolutions.length > 0 && diffForOthers !== 0) {
      let adjustLoopCount = 0;
      // diffForOthers의 절대값만큼 각 아이템을 순회 + 각 아이템당 최대 100 변동 가능성 고려
      const maxAdjustLoops = Math.abs(diffForOthers) * otherActiveResolutions.length + otherActiveResolutions.length * 100 + 1;

      while (diffForOthers !== 0 && adjustLoopCount < maxAdjustLoops) {
        const itemToAdjust = otherActiveResolutions[adjustLoopCount % otherActiveResolutions.length];
        
        if (diffForOthers > 0) { // 확률을 1 늘려야 함
          if (itemToAdjust.probability < 100) {
            itemToAdjust.probability += 1;
            diffForOthers -= 1;
          }
        } else { // 확률을 1 줄여야 함 (diffForOthers < 0)
          if (itemToAdjust.probability > 0) {
            itemToAdjust.probability -= 1;
            diffForOthers += 1;
          }
        }
        adjustLoopCount++;

        const allAtLimit = (d: number) => d > 0 
            ? otherActiveResolutions.every(r => r.probability === 100) 
            : otherActiveResolutions.every(r => r.probability === 0);

        if (allAtLimit(diffForOthers)) break;
      }
    }

    // otherActiveResolutions 조정 후에도 전체 합이 100이 아니면, mainRes에서 최종 조정 (또는 mainRes가 없는 경우 첫번째 other에서)
    // 이 시점에서 각 해상도의 확률은 0-100 범위로 클램핑
    activeResolutions.forEach(r => {
      r.probability = Math.max(0, Math.min(100, Math.round(r.probability)));
    });

    let currentTotalActiveProbability = activeResolutions.reduce((sum, r) => sum + r.probability, 0);
    let finalDiff = 100 - currentTotalActiveProbability;

    if (finalDiff !== 0 && activeResolutions.length > 0) {
      let resForFinalTweak = mainRes; // mainRes가 있으면 우선적으로 최종 조정
      
      // mainRes가 없거나, mainRes가 finalDiff를 수용할 수 없는 경우 (0%에서 빼거나 100%에서 더하려 할 때)
      if (!resForFinalTweak || 
          (finalDiff < 0 && resForFinalTweak.probability + finalDiff < 0) || 
          (finalDiff > 0 && resForFinalTweak.probability + finalDiff > 100)) {
        // 다른 해상도 중 finalDiff를 수용 가능한 해상도를 찾음
        resForFinalTweak = activeResolutions.find(r => 
          r.id !== (mainRes?.id || '') && // mainRes가 있다면 제외하고 찾기
          (finalDiff < 0 && r.probability > 0) || 
          (finalDiff > 0 && r.probability < 100)
        );
        // 그래도 없다면, 그냥 첫번째 활성 해상도 (mainRes가 될 수도 있음)
        if (!resForFinalTweak) resForFinalTweak = activeResolutions[0];
      }
      
      // 최후의 조정 대상이 된 해상도
      if (resForFinalTweak) {
        resForFinalTweak.probability += finalDiff;
        resForFinalTweak.probability = Math.max(0, Math.min(100, Math.round(resForFinalTweak.probability)));
      }
    }
    
    // 만약 위 조정 후에도 합이 100이 아니라면 (모든 해상도가 0 또는 100이라 조정 불가)
    // 극단적인 경우, 마지막으로 한번 더 체크. (보통은 여기까지 안옴)
    currentTotalActiveProbability = activeResolutions.reduce((sum, r) => sum + r.probability, 0);
    if (currentTotalActiveProbability !== 100 && activeResolutions.length === 1) {
        activeResolutions[0].probability = 100; // 활성 해상도가 하나면 무조건 100%
        console.log('[_rebalanceProbabilities] Single active resolution forced to 100%.');
    }

    console.log('[_rebalanceProbabilities] Output resolutions:', JSON.parse(JSON.stringify(resolutions)));
    return resolutions;
  }

  private static adjustProbabilities(
    resolutions: ResolutionSetting[], 
    changedResolutionId?: string, 
    isNowEnabled?: boolean, 
    setProbability?: number
  ): ResolutionSetting[] {
    console.log('[ResolutionService.adjustProbabilities] Called. changedId:', changedResolutionId, 'isNowEnabled:', isNowEnabled, 'setProb:', setProbability);
    console.log('[ResolutionService.adjustProbabilities] Input resolutions:', JSON.parse(JSON.stringify(resolutions)));

    if (!resolutions || resolutions.length === 0) {
      console.log('[ResolutionService.adjustProbabilities] No resolutions to adjust.');
      return [];
    }

    // Ensure all resolutions have a defined probability and enabled status
    let workingResolutions = resolutions.map(r => ({
      ...r,
      probability: r.enabled ? (r.probability === undefined ? 0 : r.probability) : 0, // Disabled resolutions have 0 probability
      enabled: r.enabled === undefined ? false : r.enabled,
    }));
    console.log('[ResolutionService.adjustProbabilities] workingResolutions (after ensuring defaults):', JSON.parse(JSON.stringify(workingResolutions)));

    const activeResolutions = workingResolutions.filter(r => r.enabled);
    const changedResolution = changedResolutionId ? activeResolutions.find(r => r.id === changedResolutionId) : undefined;

    if (changedResolutionId && changedResolution && isNowEnabled === false) {
      // If a resolution was just disabled, set its probability to 0
      changedResolution.probability = 0;
    }
    
    if (changedResolutionId && changedResolution && isNowEnabled === true && setProbability !== undefined) {
        // If a resolution was just enabled or its probability was explicitly set
        changedResolution.probability = Math.max(0, Math.min(100, setProbability));
    }

    let totalProbability = activeResolutions.reduce((sum, r) => sum + r.probability, 0);
    console.log('[ResolutionService.adjustProbabilities] Current totalProbability of active resolutions:', totalProbability);

    if (totalProbability > 100) {
      // Reduce probabilities proportionally if total > 100
      // Prioritize the changed resolution if its probability was explicitly set
      const scale = 100 / totalProbability;
      activeResolutions.forEach(r => {
        if (changedResolution && r.id === changedResolution.id && setProbability !== undefined) {
          // Keep the explicitly set probability if possible, adjust others around it
          // This part is tricky if the setProbability itself causes the sum > 100
          // For now, simple proportional scaling for all
           r.probability = Math.round(r.probability * scale);
        } else {
           r.probability = Math.round(r.probability * scale);
        }
      });
      // Recalculate total after rounding
      totalProbability = activeResolutions.reduce((sum, r) => sum + r.probability, 0);
      // Distribute rounding errors
      let diff = 100 - totalProbability;
      for (let r of activeResolutions) {
        if (diff === 0) break;
        if (diff > 0) { r.probability++; diff--; }
        else if (r.probability > 0) { r.probability--; diff++; }
      }
    } else if (totalProbability < 100 && activeResolutions.length > 0) {
      // Distribute remaining probability if total < 100
      const remaining = 100 - totalProbability;
      const activeCount = activeResolutions.length;
      if (activeCount > 0) {
        const share = Math.floor(remaining / activeCount);
        let remainder = remaining % activeCount;
        activeResolutions.forEach(r => { r.probability += share; });
        for (let i = 0; i < remainder; i++) {
          activeResolutions[i % activeCount].probability++;
        }
      }
    } else if (activeResolutions.length === 1 && activeResolutions[0].enabled) {
        // If only one active resolution, it should have 100%
        activeResolutions[0].probability = 100;
    }

    console.log('[ResolutionService.adjustProbabilities] Final adjusted workingResolutions:', JSON.parse(JSON.stringify(workingResolutions)));
    return workingResolutions;
  }

  static readonly DEFAULT_RESOLUTIONS: ResolutionSetting[] = [
    { id: 'default-1216-832', width: 1216, height: 832, probability: 100, enabled: true }
  ];

  static readonly MAX_ACTIVE_RESOLUTIONS = 5;
}
