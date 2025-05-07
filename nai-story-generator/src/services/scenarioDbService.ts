import { Scenario } from '@/domain/scenario/entities'; // Scenario 타입 import

const SCENARIO_PREFIX = 'scenario_';
const META_PREFIX = 'meta_';
const SCENARIO_IDS_KEY = 'scenario_ids';

export class ScenarioDbService {
  private makeSerializable(obj: any): any {
    // localStorage는 문자열만 저장하므로, 객체는 JSON 문자열로 변환
    // Date 객체 등 특정 타입은 string으로 변환될 수 있으므로 주의
    return JSON.parse(JSON.stringify(obj));
  }

  private getScenarioIds(): string[] {
    const idsJson = localStorage.getItem(SCENARIO_IDS_KEY);
    return idsJson ? JSON.parse(idsJson) : [];
  }

  private saveScenarioIds(ids: string[]): void {
    localStorage.setItem(SCENARIO_IDS_KEY, JSON.stringify(ids));
  }

  async saveScenario(scenario: Scenario): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const serializableScenario = this.makeSerializable(scenario);
        localStorage.setItem(SCENARIO_PREFIX + scenario.id, JSON.stringify(serializableScenario));
        
        const ids = this.getScenarioIds();
        if (!ids.includes(scenario.id)) {
          ids.push(scenario.id);
          this.saveScenarioIds(ids);
        }
        console.log(`[DbService] 시나리오 저장 성공 (localStorage): ${scenario.id}`);
        resolve();
      } catch (error) {
        console.error('[DbService] 시나리오 저장 실패 (localStorage):', error);
        reject('시나리오를 저장하는 중 오류가 발생했습니다.');
      }
    });
  }

  async getAllScenarios(): Promise<Scenario[]> {
    return new Promise((resolve, reject) => {
      try {
        const ids = this.getScenarioIds();
        const scenarios: Scenario[] = [];
        for (const id of ids) {
          const scenarioJson = localStorage.getItem(SCENARIO_PREFIX + id);
          if (scenarioJson) {
            scenarios.push(JSON.parse(scenarioJson) as Scenario);
          }
        }
        console.log(`[DbService] ${scenarios.length}개의 시나리오 로드 완료 (localStorage)`);
        resolve(scenarios);
      } catch (error) {
        console.error('[DbService] 시나리오 불러오기 실패 (localStorage):', error);
        reject('시나리오를 불러오는 중 오류가 발생했습니다.');
      }
    });
  }

  async getScenario(id: string): Promise<Scenario | null> {
    return new Promise((resolve, reject) => {
      try {
        const scenarioJson = localStorage.getItem(SCENARIO_PREFIX + id);
        if (scenarioJson) {
          const scenario = JSON.parse(scenarioJson) as Scenario;
          console.log(`[DbService] 시나리오 ${id} 로드 완료 (localStorage)`);
          resolve(scenario);
        } else {
          console.log(`[DbService] 시나리오 ${id} 없음 (localStorage)`);
          resolve(null);
        }
      } catch (error) {
        console.error(`[DbService] 시나리오 ${id} 불러오기 실패 (localStorage):`, error);
        reject(`시나리오 ${id}를 불러오는 중 오류가 발생했습니다.`);
      }
    });
  }

  async deleteScenario(id: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
      try {
        localStorage.removeItem(SCENARIO_PREFIX + id);
        let ids = this.getScenarioIds();
        ids = ids.filter(scenarioId => scenarioId !== id);
        this.saveScenarioIds(ids);
        console.log(`[DbService] 시나리오 ${id} 삭제 완료 (localStorage)`);
        resolve(true);
      } catch (error) {
        console.error(`[DbService] 시나리오 ${id} 삭제 실패 (localStorage):`, error);
        reject(`시나리오 ${id}를 삭제하는 중 오류가 발생했습니다.`);
      }
    });
  }

  async saveMeta(key: string, value: any): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const serializableValue = this.makeSerializable(value);
        localStorage.setItem(META_PREFIX + key, JSON.stringify(serializableValue));
        console.log(`[DbService] 메타데이터 저장 성공 (localStorage): ${key}`);
        resolve();
      } catch (error) {
        console.error('[DbService] 메타데이터 저장 실패 (localStorage):', error);
        reject('메타데이터를 저장하는 중 오류가 발생했습니다.');
      }
    });
  }

  async loadMeta(key: string): Promise<any | null> {
    return new Promise((resolve, reject) => {
      try {
        const metaJson = localStorage.getItem(META_PREFIX + key);
        if (metaJson) {
          const value = JSON.parse(metaJson);
          console.log(`[DbService] 메타데이터 ${key} 로드 완료 (localStorage)`);
          resolve(value);
        } else {
          console.log(`[DbService] 메타데이터 ${key} 없음 (localStorage)`);
          resolve(null);
        }
      } catch (error) {
        console.error(`[DbService] 메타데이터 ${key} 불러오기 실패 (localStorage):`, error);
        reject(`메타데이터 ${key}를 불러오는 중 오류가 발생했습니다.`);
      }
    });
  }
}
