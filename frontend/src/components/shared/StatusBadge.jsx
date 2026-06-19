const statusConfig = {
  // Delivery Order Status
  'Pending': { class: 'badge-warning', label: 'Pending' },
  'In Transit': { class: 'badge-info', label: 'In Transit' },
  'Delivered': { class: 'badge-success', label: 'Delivered' },
  'Cancelled': { class: 'badge-error', label: 'Cancelled' },
  
  // Truck Status
  'Idle': { class: 'badge-neutral', label: 'Idle' },
  'On Trip': { class: 'badge-info', label: 'On Trip' },
  'Maintenance': { class: 'badge-warning', label: 'Maintenance' },
  
  // Generic
  'Active': { class: 'badge-success', label: 'Active' },
  'Inactive': { class: 'badge-neutral', label: 'Inactive' },
};

export const StatusBadge = ({ status }) => {
  const config = statusConfig[status] || { class: 'badge-neutral', label: status };
  
  return (
    <span className={config.class} data-testid={`status-${status?.toLowerCase().replace(' ', '-')}`}>
      {config.label}
    </span>
  );
};
