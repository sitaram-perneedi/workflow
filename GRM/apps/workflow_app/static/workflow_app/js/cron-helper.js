/**
 * Cron Helper - Utilities for cron expression handling
 */
class CronHelper {
    constructor() {
        this.presets = {
            'every_minute': '* * * * *',
            'every_5_minutes': '*/5 * * * *',
            'every_15_minutes': '*/15 * * * *',
            'every_30_minutes': '*/30 * * * *',
            'hourly': '0 * * * *',
            'daily_9am': '0 9 * * *',
            'daily_midnight': '0 0 * * *',
            'weekly_monday_9am': '0 9 * * 1',
            'monthly_1st': '0 0 1 * *'
        };
    }

    validateCron(expression) {
        const parts = expression.trim().split(/\s+/);
        if (parts.length !== 5) {
            return { valid: false, error: 'Cron expression must have 5 parts' };
        }

        const [minute, hour, day, month, weekday] = parts;

        try {
            this.validateField(minute, 0, 59, 'minute');
            this.validateField(hour, 0, 23, 'hour');
            this.validateField(day, 1, 31, 'day');
            this.validateField(month, 1, 12, 'month');
            this.validateField(weekday, 0, 7, 'weekday');
            
            return { valid: true };
        } catch (error) {
            return { valid: false, error: error.message };
        }
    }

    validateField(field, min, max, name) {
        if (field === '*') return true;
        
        if (field.includes('/')) {
            const [range, step] = field.split('/');
            if (range !== '*' && !this.isValidRange(range, min, max)) {
                throw new Error(`Invalid ${name} range: ${range}`);
            }
            if (isNaN(step) || step < 1) {
                throw new Error(`Invalid ${name} step: ${step}`);
            }
            return true;
        }
        
        if (field.includes('-')) {
            const [start, end] = field.split('-');
            if (isNaN(start) || isNaN(end) || start < min || end > max || start > end) {
                throw new Error(`Invalid ${name} range: ${field}`);
            }
            return true;
        }
        
        if (field.includes(',')) {
            const values = field.split(',');
            for (const value of values) {
                if (isNaN(value) || value < min || value > max) {
                    throw new Error(`Invalid ${name} value: ${value}`);
                }
            }
            return true;
        }
        
        if (isNaN(field) || field < min || field > max) {
            throw new Error(`Invalid ${name} value: ${field}`);
        }
        
        return true;
    }

    isValidRange(range, min, max) {
        if (range === '*') return true;
        const num = parseInt(range);
        return !isNaN(num) && num >= min && num <= max;
    }

    describeCron(expression) {
        const parts = expression.trim().split(/\s+/);
        if (parts.length !== 5) return 'Invalid cron expression';

        const [minute, hour, day, month, weekday] = parts;

        // Check for common patterns
        if (expression === '* * * * *') return 'Every minute';
        if (expression === '0 * * * *') return 'Every hour';
        if (expression === '0 0 * * *') return 'Daily at midnight';
        if (expression === '0 9 * * *') return 'Daily at 9:00 AM';
        if (expression === '0 0 * * 0') return 'Weekly on Sunday at midnight';
        if (expression === '0 0 1 * *') return 'Monthly on the 1st at midnight';

        // Build description
        let description = 'At ';
        
        if (minute === '0' && hour !== '*') {
            description += `${hour}:00`;
        } else if (minute !== '*' && hour !== '*') {
            description += `${hour}:${minute.padStart(2, '0')}`;
        } else if (minute.includes('/')) {
            description += `every ${minute.split('/')[1]} minutes`;
        } else {
            description += `minute ${minute}`;
        }

        if (day !== '*') {
            description += ` on day ${day}`;
        }

        if (month !== '*') {
            description += ` in month ${month}`;
        }

        if (weekday !== '*') {
            const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
            description += ` on ${days[parseInt(weekday)] || `weekday ${weekday}`}`;
        }

        return description;
    }

    getNextRuns(expression, count = 5) {
        // This is a simplified implementation
        // In production, you'd use a proper cron library
        const now = new Date();
        const runs = [];
        
        for (let i = 1; i <= count; i++) {
            const nextRun = new Date(now.getTime() + (i * 60 * 1000)); // Simplified: add minutes
            runs.push(nextRun.toLocaleString());
        }
        
        return runs;
    }

    createCronBuilder() {
        return `
            <div class="cron-builder">
                <div class="cron-presets">
                    <label>Quick Presets:</label>
                    <select id="cron-presets" onchange="applyCronPreset(this.value)">
                        <option value="">-- Select Preset --</option>
                        <option value="every_minute">Every Minute</option>
                        <option value="every_5_minutes">Every 5 Minutes</option>
                        <option value="every_15_minutes">Every 15 Minutes</option>
                        <option value="every_30_minutes">Every 30 Minutes</option>
                        <option value="hourly">Hourly</option>
                        <option value="daily_9am">Daily at 9 AM</option>
                        <option value="daily_midnight">Daily at Midnight</option>
                        <option value="weekly_monday_9am">Weekly (Monday 9 AM)</option>
                        <option value="monthly_1st">Monthly (1st at Midnight)</option>
                    </select>
                </div>
                <div class="cron-fields">
                    <div class="field-group">
                        <label>Minute (0-59)</label>
                        <input type="text" id="cron-minute" placeholder="*" maxlength="20">
                    </div>
                    <div class="field-group">
                        <label>Hour (0-23)</label>
                        <input type="text" id="cron-hour" placeholder="*" maxlength="20">
                    </div>
                    <div class="field-group">
                        <label>Day (1-31)</label>
                        <input type="text" id="cron-day" placeholder="*" maxlength="20">
                    </div>
                    <div class="field-group">
                        <label>Month (1-12)</label>
                        <input type="text" id="cron-month" placeholder="*" maxlength="20">
                    </div>
                    <div class="field-group">
                        <label>Weekday (0-7)</label>
                        <input type="text" id="cron-weekday" placeholder="*" maxlength="20">
                    </div>
                </div>
                <div class="cron-result">
                    <label>Cron Expression:</label>
                    <input type="text" id="cron-result" readonly>
                    <div id="cron-description" class="cron-description"></div>
                </div>
            </div>
        `;
    }
}

// Global functions for cron builder
function applyCronPreset(preset) {
    const cronHelper = new CronHelper();
    const expression = cronHelper.presets[preset];
    
    if (expression) {
        const parts = expression.split(' ');
        document.getElementById('cron-minute').value = parts[0];
        document.getElementById('cron-hour').value = parts[1];
        document.getElementById('cron-day').value = parts[2];
        document.getElementById('cron-month').value = parts[3];
        document.getElementById('cron-weekday').value = parts[4];
        
        updateCronExpression();
    }
}

function updateCronExpression() {
    const minute = document.getElementById('cron-minute').value || '*';
    const hour = document.getElementById('cron-hour').value || '*';
    const day = document.getElementById('cron-day').value || '*';
    const month = document.getElementById('cron-month').value || '*';
    const weekday = document.getElementById('cron-weekday').value || '*';
    
    const expression = `${minute} ${hour} ${day} ${month} ${weekday}`;
    document.getElementById('cron-result').value = expression;
    
    const cronHelper = new CronHelper();
    const validation = cronHelper.validateCron(expression);
    const description = document.getElementById('cron-description');
    
    if (validation.valid) {
        description.textContent = cronHelper.describeCron(expression);
        description.style.color = '#10b981';
    } else {
        description.textContent = validation.error;
        description.style.color = '#ef4444';
    }
    
    // Update the main cron expression field if it exists
    const mainCronField = document.getElementById('cron-expression');
    if (mainCronField) {
        mainCronField.value = expression;
    }
}

// Export for global use
window.CronHelper = CronHelper;