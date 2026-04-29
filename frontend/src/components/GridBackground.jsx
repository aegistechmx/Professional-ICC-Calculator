import { Background } from 'reactflow'
import PropTypes from 'prop-types'

/**
 * Professional CAD-style grid background
 * @param {Object} props - Component props
 * @param {number} [props.gap=20] - Grid cell size (10=fine, 20=standard, 50=general)
 * @param {string} [props.color='#e5e7eb'] - Grid line color
 * @param {number} [props.size=1] - Line thickness
 */
export default function GridBackground({
  gap = 20,
  color = '#e5e7eb',
  size = 1,
}) {
  return <Background gap={gap} size={size} color={color} variant="lines" />
}

GridBackground.propTypes = {
  gap: PropTypes.number,
  color: PropTypes.string,
  size: PropTypes.number,
}
