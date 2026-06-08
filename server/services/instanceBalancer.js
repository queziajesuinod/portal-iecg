/**
 * Balanceador round-robin de instâncias Evolution API.
 *
 * Configuração via variável de ambiente EVOLUTION_INSTANCE_POOLS:
 *   EVOLUTION_INSTANCE_POOLS=IECG:IECG,IECG_2;START_IECG:START_IECG,START_IECG2
 *
 * Formato: chave:instancia1,instancia2;chave2:instanciaA,instanciaB
 *
 * Quando resolveInstance('IECG') é chamado, o balanceador alterna entre
 * IECG e IECG_2 em round-robin. Se a chave não tiver pool configurado,
 * retorna a própria instância sem alteração.
 */

function parsePools(raw) {
  const pools = new Map();
  if (!raw) return pools;

  raw.split(';').forEach((entry) => {
    const colonIdx = entry.indexOf(':');
    if (colonIdx === -1) return;
    const key = entry.slice(0, colonIdx).trim();
    const instances = entry.slice(colonIdx + 1).split(',').map((s) => s.trim()).filter(Boolean);
    if (key && instances.length > 0) pools.set(key, instances);
  });

  return pools;
}

class InstanceBalancer {
  constructor() {
    this.pools = parsePools(process.env.EVOLUTION_INSTANCE_POOLS);
    // Contadores round-robin por chave (em memória — reinicia com o processo,
    // o que é suficiente para balancear; não precisa ser persistido)
    this.counters = new Map();

    if (this.pools.size > 0) {
      const resumo = [...this.pools.entries()]
        .map(([k, v]) => `${k} → [${v.join(', ')}]`)
        .join(' | ');
      console.log(`[InstanceBalancer] Pools configurados: ${resumo}`);
    }
  }

  /**
   * Dado um nome de instância (ou chave de pool), retorna a próxima
   * instância do pool em round-robin. Se não houver pool para essa
   * chave, retorna a própria instância sem alteração.
   *
   * @param {string} instanceName
   * @returns {string}
   */
  next(instanceName) {
    if (!instanceName) return instanceName;

    const pool = this.pools.get(instanceName);
    if (!pool || pool.length === 0) return instanceName;
    if (pool.length === 1) return pool[0];

    const current = this.counters.get(instanceName) || 0;
    const chosen = pool[current % pool.length];
    this.counters.set(instanceName, current + 1);

    return chosen;
  }

  /**
   * Retorna o estado atual dos contadores (útil para debug/logs).
   */
  status() {
    const result = {};
    this.pools.forEach((instances, key) => {
      const idx = this.counters.get(key) || 0;
      result[key] = {
        pool: instances,
        proxima: instances[idx % instances.length],
        totalEnvios: idx,
      };
    });
    return result;
  }
}

module.exports = new InstanceBalancer();
