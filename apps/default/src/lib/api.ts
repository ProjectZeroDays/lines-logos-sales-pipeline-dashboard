import axios from 'axios';
import type { Deal, Metric } from '@/types/sales';

const API_BASE = '/api/taskade';

export const salesApi = {
  async fetchDeals(): Promise<Deal[]> {
    const response = await axios.get(`${API_BASE}/projects/69d7orKUKJ2E4BA7/nodes`);
    
    return response.data.payload.nodes.map((node: any) => ({
      id: node.id,
      title: node.fieldValues['/text'] || '',
      company: node.fieldValues['/attributes/@cmp01'] || '',
      contact: node.fieldValues['/attributes/@cnt01'] || '',
      value: node.fieldValues['/attributes/@val01'] || 0,
      probability: node.fieldValues['/attributes/@prob1'] || 0,
      stage: node.fieldValues['/attributes/@stg01'] || 'lead',
      source: node.fieldValues['/attributes/@src01'] || 'inbound',
      completed: false // Will be derived from stage
    })).map((deal: Deal) => ({
      ...deal,
      completed: deal.stage === 'closed-won'
    }));
  },

  async fetchMetrics(): Promise<Metric[]> {
    const response = await axios.get(`${API_BASE}/projects/Qz8XcCjBP1KGeUia/nodes`);
    
    return response.data.payload.nodes.map((node: any) => ({
      id: node.id,
      title: node.fieldValues['/text'] || '',
      metric: node.fieldValues['/attributes/@mtr01'] || '',
      value: node.fieldValues['/attributes/@vl001'] || 0,
      period: node.fieldValues['/attributes/@prd01'] || ''
    }));
  }
};
