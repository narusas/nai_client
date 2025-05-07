import { Scenario } from '@/domain/scenario/entities';
import { ScenarioRepository } from '@/domain/scenario/ports';
import { ScenarioDbService } from '@/services/scenarioDbService';

export class ScenarioRepositoryImpl implements ScenarioRepository {
  private dbService: ScenarioDbService;

  constructor() {
    this.dbService = new ScenarioDbService(); 
  }

  async saveScenario(scenario: Scenario): Promise<void> {
    console.log(`[ScenarioRepositoryImpl] saveScenario CALLED with scenario id: ${scenario.id}, name: '${scenario.name}'`);
    const scenarioToSave = {
      ...scenario,
      createdAt: typeof scenario.createdAt === 'string' ? scenario.createdAt : scenario.createdAt.toISOString(),
      updatedAt: typeof scenario.updatedAt === 'string' ? scenario.updatedAt : scenario.updatedAt.toISOString(),
    };
    await this.dbService.saveScenario(scenarioToSave);
    console.log(`[ScenarioRepositoryImpl] Scenario ${scenario.id} ('${scenario.name}') SAVED successfully via dbService.`);
  }

  async getScenarioById(id: string): Promise<Scenario | null> {
    console.log(`[ScenarioRepositoryImpl] getScenarioById CALLED with id: ${id}`);
    const scenario = await this.dbService.getScenario(id);
    if (scenario) {
      return {
        ...scenario,
        createdAt: new Date(scenario.createdAt),
        updatedAt: new Date(scenario.updatedAt),
      };
    }
    console.log(`[ScenarioRepositoryImpl] getScenarioById RETURNING for id ${id}: ${scenario ? scenario.id : 'null'} via dbService`);
    return null;
  }

  async getAllScenarios(): Promise<Scenario[]> {
    console.log(`[ScenarioRepositoryImpl] getAllScenarios CALLED via dbService`);
    const scenarios = await this.dbService.getAllScenarios();
    return scenarios.map(scenario => ({
      ...scenario,
      createdAt: new Date(scenario.createdAt),
      updatedAt: new Date(scenario.updatedAt),
    }));
  }

  async deleteScenario(id: string): Promise<void> {
    console.log(`[ScenarioRepositoryImpl] deleteScenario CALLED for id: ${id} via dbService`);
    await this.dbService.deleteScenario(id);
    console.log(`[ScenarioRepositoryImpl] Scenario ${id} DELETED successfully via dbService.`);
  }

  async getLastOpenedScenario(): Promise<Scenario | null> {
    console.log(`[ScenarioRepositoryImpl] getLastOpenedScenario CALLED via dbService`);
    const scenarios = await this.getAllScenarios(); 
    if (scenarios.length === 0) {
      return null;
    }
    const sortedScenarios = scenarios.sort((a, b) => 
      b.updatedAt.getTime() - a.updatedAt.getTime()
    );
    console.log(`[ScenarioRepositoryImpl] getLastOpenedScenario RETURNING: ${sortedScenarios[0]?.id}`);
    return sortedScenarios[0] || null;
  }
}
