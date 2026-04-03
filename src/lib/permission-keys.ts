export const permissionKeys = {
  superAdmin: '*:*:*',
  system: {
    user: {
      add: 'system:user:add',
      edit: 'system:user:edit',
      remove: 'system:user:remove',
      export: 'system:user:export',
      resetPwd: 'system:user:resetPwd',
    },
    role: {
      add: 'system:role:add',
      edit: 'system:role:edit',
      remove: 'system:role:remove',
      export: 'system:role:export',
    },
    menu: {
      add: 'system:menu:add',
      edit: 'system:menu:edit',
      remove: 'system:menu:remove',
    },
    dept: {
      add: 'system:dept:add',
      edit: 'system:dept:edit',
      remove: 'system:dept:remove',
    },
    post: {
      add: 'system:post:add',
      edit: 'system:post:edit',
      remove: 'system:post:remove',
      export: 'system:post:export',
    },
    dict: {
      list: 'system:dict:list',
      add: 'system:dict:add',
      edit: 'system:dict:edit',
      remove: 'system:dict:remove',
      export: 'system:dict:export',
    },
    config: {
      add: 'system:config:add',
      edit: 'system:config:edit',
      remove: 'system:config:remove',
      export: 'system:config:export',
    },
    notice: {
      add: 'system:notice:add',
      edit: 'system:notice:edit',
      remove: 'system:notice:remove',
    },
  },
  monitor: {
    online: {
      forceLogout: 'monitor:online:forceLogout',
    },
    job: {
      list: 'monitor:job:list',
      query: 'monitor:job:query',
      add: 'monitor:job:add',
      edit: 'monitor:job:edit',
      remove: 'monitor:job:remove',
      export: 'monitor:job:export',
      changeStatus: 'monitor:job:changeStatus',
    },
    logininfor: {
      remove: 'monitor:logininfor:remove',
      unlock: 'monitor:logininfor:unlock',
      export: 'monitor:logininfor:export',
    },
    operlog: {
      query: 'monitor:operlog:query',
      remove: 'monitor:operlog:remove',
      export: 'monitor:operlog:export',
    },
    cache: {
      manage: ['monitor:cache:remove', 'monitor:cache:clear', 'monitor:cache:clean'],
    },
    druid: {
      scope: 'monitor:druid:',
      view: ['monitor:druid:list', 'monitor:druid:query', 'monitor:druid:view'],
    },
  },
  tool: {
    build: {
      scope: 'tool:build:',
      edit: ['tool:build:edit', 'tool:build:save'],
      import: ['tool:build:import'],
      export: ['tool:build:export', 'tool:build:download'],
    },
    gen: {
      code: 'tool:gen:code',
      import: 'tool:gen:import',
      edit: 'tool:gen:edit',
      remove: 'tool:gen:remove',
      preview: 'tool:gen:preview',
    },
    swagger: {
      scope: 'tool:swagger:',
      view: ['tool:swagger:list', 'tool:swagger:query', 'tool:swagger:view'],
    },
  },
} as const
