/*
 * Copyright 2022 The Backstage Authors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { useReducer, Reducer } from 'react';
import useAsync from 'react-use/lib/useAsync';
import { useApi } from '@backstage/core-plugin-api';
import { EntityName } from '@backstage/catalog-model';
import { techdocsStorageApiRef } from '../../../api';
import { EntityDocs } from '../Reader';

enum Types {
  CHECKING = 'checking',
  BUILDING = 'building',
  SUCCESS = 'success',
  ERROR = 'error',
}

enum Result {
  CACHED = 'cached',
  UPDATED = 'updated',
}

type Action =
  | {
      type: Types.CHECKING;
    }
  | {
      type: Types.BUILDING;
      line?: string;
    }
  | {
      type: Types.SUCCESS;
      result: string;
    }
  | {
      type: Types.ERROR;
      error: Error;
    };

export enum Status {
  CHECKING = 'checking',
  BUILDING = 'building',
  BUILD_READY = 'BUILD_READY',
  UP_TO_DATE = 'UP_TO_DATE',
  ERROR = 'error',
}

type State = {
  status: Status;
  log: string[];
  error?: Error;
};

const isResult = (result: string): result is Result => {
  const values = Object.values<string>(Result);
  return values.includes(result);
};

const reducer: Reducer<State, Action> = (state, action) => {
  switch (action.type) {
    case Types.CHECKING:
      return {
        ...state,
        status: Status.CHECKING,
        error: undefined,
      };
    case Types.BUILDING:
      return {
        ...state,
        status: Status.BUILDING,
        log: action.line ? state.log.concat(action.line) : state.log,
      };
    case Types.SUCCESS:
      if (!isResult(action.result)) {
        throw new Error('Unexpected return state');
      }
      return {
        ...state,
        status:
          action.result === Result.CACHED
            ? Status.UP_TO_DATE
            : Status.BUILD_READY,
      };
    case Types.ERROR:
      return {
        ...state,
        status: Status.ERROR,
        error: action.error,
      };
    default:
      return state;
  }
};

export const useTechDocsSync = (
  entityName: EntityName,
  entityDocs: EntityDocs,
) => {
  const techdocsStorageApi = useApi(techdocsStorageApiRef);
  const [sync, dispatch] = useReducer(reducer, {
    status: Status.CHECKING,
    log: [],
  });

  useAsync(async () => {
    dispatch({ type: Types.CHECKING });

    const buildingTimeout = setTimeout(() => {
      dispatch({ type: Types.BUILDING });
    }, 1000);

    try {
      const result = await techdocsStorageApi.syncEntityDocs(
        entityName,
        (line: string) => {
          dispatch({ type: Types.BUILDING, line });
        },
      );
      dispatch({ type: Types.SUCCESS, result });
    } catch (error) {
      dispatch({ type: Types.ERROR, error });
    } finally {
      clearTimeout(buildingTimeout);
    }
  }, [entityName, dispatch, techdocsStorageApi]);

  if (entityDocs.loading && sync.status === Status.BUILD_READY) {
    dispatch({ type: Types.SUCCESS, result: Result.CACHED });
  }

  return sync;
};

export type DocsSync = ReturnType<typeof useTechDocsSync>;
