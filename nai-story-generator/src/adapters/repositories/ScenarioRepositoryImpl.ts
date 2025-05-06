import { Scenario } from '@/domain/scenario/entities';
import { ScenarioRepository } from '@/domain/scenario/ports';

const SCENARIOS_STORAGE_KEY = 'scenarios';

export class ScenarioRepositoryImpl implements ScenarioRepository {
  private getScenarios(): Scenario[] {
    const scenariosJson = localStorage.getItem(SCENARIOS_STORAGE_KEY);
    if (!scenariosJson) return [];
    const scenarios = JSON.parse(scenariosJson) as Scenario[];
    // createdAt, updatedAt을 Date 객체로 변환
    return scenarios.map(scenario => ({
      ...scenario,
      createdAt: new Date(scenario.createdAt),
      updatedAt: new Date(scenario.updatedAt),
    }));
  }

  private saveScenarios(scenarios: Scenario[]): void {
    localStorage.setItem(SCENARIOS_STORAGE_KEY, JSON.stringify(scenarios));
  }

  async saveScenario(scenario: Scenario): Promise<void> {
    const scenarios = this.getScenarios();
    const existingIndex = scenarios.findIndex((s) => s.id === scenario.id);
    if (existingIndex > -1) {
      scenarios[existingIndex] = scenario;
    } else {
      scenarios.push(scenario);
    }
    this.saveScenarios(scenarios);
  }

  async getScenarioById(id: string): Promise<Scenario | null> {
    const scenarios = this.getScenarios();
    return scenarios.find((s) => s.id === id) || null;
  }

  async getAllScenarios(): Promise<Scenario[]> {
    return Promise.resolve(this.getScenarios());
  }

  async deleteScenario(id: string): Promise<void> {
    let scenarios = this.getScenarios();
    scenarios = scenarios.filter((s) => s.id !== id);
    this.saveScenarios(scenarios);
  }

  async getLastOpenedScenario(): Promise<Scenario | null> {
    const scenarios = this.getScenarios();
    if (scenarios.length === 0) {
      return null;
    }
    // updatedAt을 기준으로 내림차순 정렬하여 가장 최근 시나리오를 찾습니다.
    const sortedScenarios = scenarios.sort((a, b) => 
      new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime()
    );
    return sortedScenarios[0];
  }
}
