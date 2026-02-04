const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');

/**
 * GET /api/goals/:year
 * Fetch all agent goals for a specific year
 */
router.get('/:year', async (req, res) => {
  try {
    const { year } = req.params;
    const { type } = req.query; // 'life' or 'elementary'

    // Validate year parameter
    if (!year || isNaN(year)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid year parameter'
      });
    }

    // Determine which insurance type to filter by
    const insuranceField = type === 'elementary' ? 'elementary' : 'insurance';

    // Fetch agents with their goals for the specified year and insurance type
    const { data: agents, error: agentsError } = await supabase
      .from('agent_data')
      .select('id, agent_name, department, category, sub_category, inspector, insurance, elementary, is_active')
      .eq(insuranceField, true)
      .not('agent_name', 'is', null)
      .neq('agent_name', '')
      .order('agent_name', { ascending: true });

    console.log('Goals API - Fetched agents:', {
      count: agents?.length || 0,
      sample: agents?.slice(0, 3),
      year
    });

    if (agentsError) {
      throw agentsError;
    }

    // Fetch goals for this year
    const { data: goals, error: goalsError } = await supabase
      .from('agent_yearly_goals')
      .select('*')
      .eq('year', year);

    if (goalsError) {
      throw goalsError;
    }

    // Create a map of goals by agent_id for quick lookup
    const goalsMap = {};
    if (goals) {
      goals.forEach(goal => {
        goalsMap[goal.agent_id] = goal;
      });
    }

    // Combine agents with their goals
    const result = agents.map(agent => {
      const goal = goalsMap[agent.id] || {};
      const baseData = {
        agent_id: agent.id,
        agent_name: agent.agent_name,
        department: agent.department,
        category: agent.category,
        sub_category: agent.sub_category,
        inspector: agent.inspector,
        goal_id: goal.id || null,
        year: parseInt(year)
      };

      if (type === 'elementary') {
        return {
          ...baseData,
          elementary_goal: goal.elementary_goal || 0
        };
      } else {
        return {
          ...baseData,
          pension_goal: goal.pension_goal || 0,
          risk_goal: goal.risk_goal || 0,
          financial_goal: goal.financial_goal || 0,
          pension_transfer_goal: goal.pension_transfer_goal || 0
        };
      }
    });

    return res.json({
      success: true,
      data: result,
      year: parseInt(year),
      count: result.length
    });

  } catch (error) {
    console.error('Error fetching goals:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch goals',
      error: error.message
    });
  }
});

/**
 * PUT /api/goals
 * Bulk update or insert agent goals
 * Body: { updates: [{ agent_id, year, ... }], type: 'life' | 'elementary' }
 */
router.put('/', async (req, res) => {
  try {
    const { updates, type } = req.body;

    if (!updates || !Array.isArray(updates) || updates.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid updates array'
      });
    }

    const updatedGoals = [];

    for (const update of updates) {
      const { agent_id, year } = update;

      // Validate required fields
      if (!agent_id || !year) {
        throw new Error('agent_id and year are required for each update');
      }

      // Check if goal already exists
      const { data: existing, error: checkError } = await supabase
        .from('agent_yearly_goals')
        .select('id')
        .eq('agent_id', agent_id)
        .eq('year', year)
        .single();

      if (checkError && checkError.code !== 'PGRST116') { // PGRST116 is "not found" which is ok
        throw checkError;
      }

      const goalData = {
        agent_id,
        year,
        updated_at: new Date().toISOString()
      };

      // Add appropriate goal fields based on type
      if (type === 'elementary') {
        goalData.elementary_goal = update.elementary_goal || 0;
      } else {
        goalData.pension_goal = update.pension_goal || 0;
        goalData.risk_goal = update.risk_goal || 0;
        goalData.financial_goal = update.financial_goal || 0;
        goalData.pension_transfer_goal = update.pension_transfer_goal || 0;
      }

      if (existing) {
        // Update existing goal
        const { data, error } = await supabase
          .from('agent_yearly_goals')
          .update(goalData)
          .eq('id', existing.id)
          .select()
          .single();

        if (error) throw error;
        updatedGoals.push(data);
      } else {
        // Insert new goal
        const { data, error } = await supabase
          .from('agent_yearly_goals')
          .insert({
            ...goalData,
            created_at: new Date().toISOString()
          })
          .select()
          .single();

        if (error) throw error;
        updatedGoals.push(data);
      }
    }

    return res.json({
      success: true,
      message: 'Goals updated successfully',
      data: updatedGoals,
      count: updatedGoals.length
    });

  } catch (error) {
    console.error('Error updating goals:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update goals',
      error: error.message
    });
  }
});

/**
 * DELETE /api/goals/:agent_id/:year
 * Delete a specific agent's goals for a year
 */
router.delete('/:agent_id/:year', async (req, res) => {
  try {
    const { agent_id, year } = req.params;

    if (!agent_id || !year || isNaN(agent_id) || isNaN(year)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid agent_id or year parameter'
      });
    }

    const { data, error } = await supabase
      .from('agent_yearly_goals')
      .delete()
      .eq('agent_id', agent_id)
      .eq('year', year)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({
          success: false,
          message: 'Goal not found'
        });
      }
      throw error;
    }

    return res.json({
      success: true,
      message: 'Goal deleted successfully',
      data
    });

  } catch (error) {
    console.error('Error deleting goal:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete goal',
      error: error.message
    });
  }
});

/**
 * GET /api/goals/agent/:agent_id
 * Fetch all goals for a specific agent across all years
 */
router.get('/agent/:agent_id', async (req, res) => {
  try {
    const { agent_id } = req.params;

    if (!agent_id || isNaN(agent_id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid agent_id parameter'
      });
    }

    const { data: goals, error: goalsError } = await supabase
      .from('agent_yearly_goals')
      .select(`
        *,
        agent_data (
          agent_name,
          department,
          category,
          sub_category,
          inspector
        )
      `)
      .eq('agent_id', agent_id)
      .order('year', { ascending: false });

    if (goalsError) {
      throw goalsError;
    }

    // Flatten the structure
    const result = goals.map(goal => ({
      ...goal,
      agent_name: goal.agent_data?.agent_name,
      department: goal.agent_data?.department,
      category: goal.agent_data?.category,
      sub_category: goal.agent_data?.sub_category,
      inspector: goal.agent_data?.inspector,
      agent_data: undefined // Remove nested object
    }));

    return res.json({
      success: true,
      data: result,
      count: result.length
    });

  } catch (error) {
    console.error('Error fetching agent goals:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch agent goals',
      error: error.message
    });
  }
});

/**
 * GET /api/goals/summary/:year
 * Get summary statistics for goals in a specific year
 */
router.get('/summary/:year', async (req, res) => {
  try {
    const { year } = req.params;

    if (!year || isNaN(year)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid year parameter'
      });
    }

    const { data: goals, error } = await supabase
      .from('agent_yearly_goals')
      .select('*')
      .eq('year', year);

    if (error) {
      throw error;
    }

    // Calculate summary statistics
    const summary = {
      agents_with_goals: goals.length,
      total_pension_goal: 0,
      total_risk_goal: 0,
      total_financial_goal: 0,
      total_pension_transfer_goal: 0,
      avg_pension_goal: 0,
      avg_risk_goal: 0,
      avg_financial_goal: 0,
      avg_pension_transfer_goal: 0
    };

    if (goals.length > 0) {
      goals.forEach(goal => {
        summary.total_pension_goal += goal.pension_goal || 0;
        summary.total_risk_goal += goal.risk_goal || 0;
        summary.total_financial_goal += goal.financial_goal || 0;
        summary.total_pension_transfer_goal += goal.pension_transfer_goal || 0;
      });

      summary.avg_pension_goal = summary.total_pension_goal / goals.length;
      summary.avg_risk_goal = summary.total_risk_goal / goals.length;
      summary.avg_financial_goal = summary.total_financial_goal / goals.length;
      summary.avg_pension_transfer_goal = summary.total_pension_transfer_goal / goals.length;
    }

    return res.json({
      success: true,
      data: summary,
      year: parseInt(year)
    });

  } catch (error) {
    console.error('Error fetching goals summary:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch goals summary',
      error: error.message
    });
  }
});

module.exports = router;
