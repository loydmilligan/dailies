// Role-Based Access Control (RBAC) Middleware
// Provides comprehensive authorization and permission management

const { logSecurityEvent } = require('./auth');

/**
 * Define roles and their hierarchical permissions
 */
const ROLES = {
  admin: {
    name: 'admin',
    permissions: [
      'user:create', 'user:read', 'user:update', 'user:delete',
      'content:create', 'content:read', 'content:update', 'content:delete', 'content:analyze',
      'digest:create', 'digest:read', 'digest:update', 'digest:delete',
      'system:read', 'system:write', 'system:admin',
      'admin:read', 'admin:write',
      'logs:read', 'analytics:read'
    ]
  },
  editor: {
    name: 'editor',
    permissions: [
      'user:read',
      'content:create', 'content:read', 'content:update', 'content:delete', 'content:analyze',
      'digest:create', 'digest:read', 'digest:update', 'digest:delete'
    ]
  },
  user: {
    name: 'user',
    permissions: [
      'content:read', 'content:create', 'content:analyze',
      'digest:read',
      'user:read:own', 'user:update:own'
    ]
  },
  guest: {
    name: 'guest',
    permissions: [
      'content:read'
    ]
  }
};

/**
 * Resource-based permissions for fine-grained access control
 */
const RESOURCE_PERMISSIONS = {
  // Content permissions
  'content:create': 'Create new content items',
  'content:read': 'Read content items',
  'content:update': 'Update content items', 
  'content:delete': 'Delete content items',
  'content:classify': 'Trigger AI classification',
  'content:analyze': 'Analyze content with AI (political analysis, etc.)',
  
  // User management permissions
  'user:create': 'Create new users',
  'user:read': 'Read user information',
  'user:update': 'Update user information',
  'user:delete': 'Delete users',
  'user:read:own': 'Read own user information',
  'user:update:own': 'Update own user information',
  
  // Digest permissions
  'digest:create': 'Create daily digests',
  'digest:read': 'Read daily digests',
  'digest:update': 'Update daily digests',
  'digest:delete': 'Delete daily digests',
  
  // System permissions
  'system:read': 'Read system status and configuration',
  'system:write': 'Modify system configuration',
  'system:admin': 'Full system administration',
  
  // Admin permissions
  'admin:read': 'Read administrative information and statistics',
  'admin:write': 'Modify administrative settings',
  
  // Analytics and logs
  'logs:read': 'Read system logs',
  'analytics:read': 'Read analytics data'
};

/**
 * Check if a role has a specific permission
 * @param {string} roleName - Role name
 * @param {string} permission - Permission to check
 * @returns {boolean} True if role has permission
 */
function hasPermission(roleName, permission) {
  const role = ROLES[roleName];
  if (!role) {
    return false;
  }
  
  return role.permissions.includes(permission);
}

/**
 * Check if user can access own resource
 * @param {Object} user - User object from JWT
 * @param {string} resourceUserId - User ID of the resource owner
 * @returns {boolean} True if user can access own resource
 */
function canAccessOwnResource(user, resourceUserId) {
  return user.userId === parseInt(resourceUserId) || user.userId === resourceUserId;
}

/**
 * Middleware to require specific permission
 * @param {string} permission - Required permission
 * @param {Object} options - Additional options
 * @returns {Function} Express middleware
 */
function requirePermission(permission, options = {}) {
  return (req, res, next) => {
    // Ensure user is authenticated first
    if (!req.user) {
      logSecurityEvent('authorization_failed_not_authenticated', {
        permission,
        endpoint: req.path,
        ip: req.ip
      });
      
      return res.status(401).json({
        error: 'Authentication required',
        message: 'Please log in to access this resource',
        code: 'AUTH_REQUIRED'
      });
    }

    const userRole = req.user.role || 'guest';
    const userId = req.user.userId;
    
    // Check for "own resource" permissions
    if (permission.endsWith(':own')) {
      const basePermission = permission.replace(':own', '');
      const resourceUserId = req.params.userId || req.params.id || req.body.userId;
      
      // Check if user has general permission OR can access own resource
      const hasGeneralPermission = hasPermission(userRole, basePermission);
      const hasOwnPermission = hasPermission(userRole, permission) && canAccessOwnResource(req.user, resourceUserId);
      
      if (!hasGeneralPermission && !hasOwnPermission) {
        logSecurityEvent('authorization_failed_insufficient_permissions', {
          userId,
          userRole,
          permission,
          resourceUserId,
          endpoint: req.path,
          ip: req.ip
        });
        
        return res.status(403).json({
          error: 'Insufficient permissions',
          message: 'You do not have permission to access this resource',
          code: 'PERMISSION_DENIED'
        });
      }
    } else {
      // Check regular permission
      if (!hasPermission(userRole, permission)) {
        logSecurityEvent('authorization_failed_insufficient_permissions', {
          userId,
          userRole,
          permission,
          endpoint: req.path,
          ip: req.ip
        });
        
        return res.status(403).json({
          error: 'Insufficient permissions',
          message: `This action requires '${permission}' permission`,
          code: 'PERMISSION_DENIED'
        });
      }
    }
    
    // Log successful authorization for sensitive operations
    if (options.logAccess) {
      logSecurityEvent('authorization_granted', {
        userId,
        userRole,
        permission,
        endpoint: req.path,
        ip: req.ip
      });
    }
    
    next();
  };
}

/**
 * Middleware to require specific role
 * @param {string|Array} roles - Required role(s)
 * @returns {Function} Express middleware
 */
function requireRole(roles) {
  const allowedRoles = Array.isArray(roles) ? roles : [roles];
  
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'Please log in to access this resource',
        code: 'AUTH_REQUIRED'
      });
    }

    const userRole = req.user.role || 'guest';
    
    if (!allowedRoles.includes(userRole)) {
      logSecurityEvent('authorization_failed_insufficient_role', {
        userId: req.user.userId,
        userRole,
        requiredRoles: allowedRoles,
        endpoint: req.path,
        ip: req.ip
      });
      
      return res.status(403).json({
        error: 'Insufficient role',
        message: `This action requires one of these roles: ${allowedRoles.join(', ')}`,
        code: 'ROLE_REQUIRED'
      });
    }
    
    next();
  };
}

/**
 * Middleware for resource ownership validation
 * @param {string} resourceIdParam - Parameter name for resource ID
 * @param {string} ownerField - Field name for resource owner
 * @returns {Function} Express middleware
 */
function requireResourceOwnership(resourceIdParam = 'id', ownerField = 'user_id') {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
    }

    // Admins can access any resource
    if (req.user.role === 'admin') {
      return next();
    }

    const resourceId = req.params[resourceIdParam];
    const userId = req.user.userId;

    try {
      // This would need to be implemented based on your specific data access layer
      // For now, this is a placeholder that should be customized per use case
      const resource = await getResourceOwner(resourceId, ownerField);
      
      if (!resource || resource[ownerField] !== userId) {
        logSecurityEvent('authorization_failed_not_owner', {
          userId,
          resourceId,
          resourceType: resourceIdParam,
          endpoint: req.path,
          ip: req.ip
        });
        
        return res.status(403).json({
          error: 'Resource access denied',
          message: 'You can only access your own resources',
          code: 'OWNERSHIP_REQUIRED'
        });
      }
      
      next();
    } catch (error) {
      console.error('Resource ownership check failed:', error);
      res.status(500).json({
        error: 'Authorization check failed',
        code: 'AUTH_CHECK_ERROR'
      });
    }
  };
}

/**
 * Get resource owner (placeholder - implement based on your data layer)
 * @param {string} resourceId - Resource identifier
 * @param {string} ownerField - Owner field name
 * @returns {Object} Resource with owner information
 */
async function getResourceOwner(resourceId, ownerField) {
  // TODO: Implement based on your database access layer
  // This is a placeholder that should query your database
  console.warn('getResourceOwner not implemented - customize for your data layer');
  return null;
}

/**
 * Get user permissions for API responses
 * @param {string} roleName - User role
 * @returns {Array} Array of permissions
 */
function getUserPermissions(roleName) {
  const role = ROLES[roleName];
  return role ? role.permissions : [];
}

/**
 * Validate role exists
 * @param {string} roleName - Role to validate
 * @returns {boolean} True if role exists
 */
function isValidRole(roleName) {
  return Object.keys(ROLES).includes(roleName);
}

/**
 * Get role hierarchy for inheritance
 * @param {string} roleName - Role name
 * @returns {Array} Array of roles in hierarchy
 */
function getRoleHierarchy(roleName) {
  // Define role hierarchy (higher roles inherit from lower ones)
  const hierarchy = {
    admin: ['admin', 'editor', 'user', 'guest'],
    editor: ['editor', 'user', 'guest'],
    user: ['user', 'guest'],
    guest: ['guest']
  };
  
  return hierarchy[roleName] || ['guest'];
}

module.exports = {
  ROLES,
  RESOURCE_PERMISSIONS,
  hasPermission,
  requirePermission,
  requireRole,
  requireResourceOwnership,
  getUserPermissions,
  isValidRole,
  getRoleHierarchy,
  canAccessOwnResource
};