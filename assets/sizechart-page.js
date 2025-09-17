// Function to process range strings like '23.8-24.2'
function processRange(rangeString, factor) {
  const [start, end] = rangeString.split('-');
  const startValue = parseFloat(start);
  const endValue = parseFloat(end);

  if (isNaN(startValue) || isNaN(endValue)) {
    console.error('Invalid range values:', rangeString);
    return rangeString; // Return original range if invalid
  }

  const convertedStart = (startValue * factor).toFixed(1);
  const convertedEnd = (endValue * factor).toFixed(1);

  return `${convertedStart}-${convertedEnd}`;
}

// Convert table values, handling ranges
function convertTableValues(factor, toInches, toggle) {
  // Get the specific size chart section related to the current toggle
  const sizeChartSection = toggle.closest('#size-chart-content');
  const rows = sizeChartSection.querySelectorAll('tbody.size-chart-body tr');

  if (!sizeChartSection || rows.length === 0) {
    console.error('No size chart section or rows found for toggle:', toggle);
    return;
  }

  rows.forEach((row) => {
    const cells = row.querySelectorAll('td.convert');
    cells.forEach((cell) => {
      let value = cell.dataset.originalValue;
      if (toInches) {
        if (value.includes('-')) {
          // Process range
          value = processRange(value, factor);
        } else {
          // Convert single value
          value = parseFloat(value);
          if (!isNaN(value)) {
            value = (value * factor).toFixed(1); // Convert to float with one decimal
          }
        }
      } else {
        // Revert to original value
        value = cell.dataset.originalValue;
      }
      cell.textContent = value;
    });
  });
}

// Store original values on page load
function storeOriginalValues() {
  const rows = document.querySelectorAll('tbody.size-chart-body tr');

  if (rows.length === 0) {
    console.warn('No size chart rows found to store original values');
  }

  rows.forEach((row) => {
    const cells = row.querySelectorAll('td.convert');
    cells.forEach((cell) => {
      if (!cell.dataset.originalValue) {
        cell.dataset.originalValue = cell.textContent.trim();
      }
    });
  });
}

// Initialize original values when the DOM content is fully loaded
document.addEventListener('DOMContentLoaded', (event) => {
  storeOriginalValues();

  // Attach event listeners to each toggle switch
  document.querySelectorAll('.toggle-input').forEach((toggle) => {
    toggle.addEventListener('change', function () {
      const factor = 0.393701; // Conversion factor from cm to inches
      const toInches = this.checked;
      console.log('Toggle switched:', this, 'To inches:', toInches);
      convertTableValues(factor, toInches, this);
    });
  });
});
