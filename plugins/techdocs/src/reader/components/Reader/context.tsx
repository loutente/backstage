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

import React, {
  PropsWithChildren,
  ComponentType,
  createContext,
  useContext,
} from 'react';

import useAsyncRetry from 'react-use/lib/useAsyncRetry';

import { EntityName } from '@backstage/catalog-model';
import { useApi } from '@backstage/core-plugin-api';

import { techdocsStorageApiRef } from '../../../api';
import { useTechDocsReaderPage } from '../TechDocsReaderPage';

/**
 * Fetches the entity raw docs
 * @param path - the docs url path
 * @param entityName - the Backstage entity name
 * @public
 */
export const useEntityDocs = (path: string, entityName: EntityName) => {
  const techdocsStorageApi = useApi(techdocsStorageApiRef);

  const entityDocs = useAsyncRetry(async () => {
    return await techdocsStorageApi.getEntityDocs(entityName, path);
  }, [path]);

  return entityDocs;
};

/**
 * Backstage entity raw docs
 * @public
 */
export type EntityDocs = ReturnType<typeof useEntityDocs>;

type TechDocsReaderValue = {
  path: string;
  entityName: EntityName;
  entityDocs: EntityDocs;
  setReady: () => void;
};

const TechDocsReaderContext = createContext<TechDocsReaderValue>(
  {} as TechDocsReaderValue,
);

/**
 * Props for {@link TechDocsReaderProvider}
 * @public
 */
export type TechDocsReaderProviderProps = PropsWithChildren<{
  entityName: EntityName;
  onReady?: () => void;
}>;

/**
 * Provides access to the Reader context
 * @public
 */
export const TechDocsReaderProvider = ({
  children,
  entityName,
  onReady = () => {},
}: TechDocsReaderProviderProps) => {
  const { path } = useTechDocsReaderPage();
  const entityDocs = useEntityDocs(path, entityName);

  const value = {
    path,
    entityName,
    entityDocs,
    setReady: onReady,
  };

  return (
    <TechDocsReaderContext.Provider value={value}>
      {children}
    </TechDocsReaderContext.Provider>
  );
};

/**
 * Note: this HOC is currently being exported so that we can rapidly
 * iterate on alternative <Reader /> implementations that extend core
 * functionality. There is no guarantee that this HOC will continue to be
 * exported by the package in the future!
 *
 * todo: Make public or stop exporting (ctrl+f "altReaderExperiments")
 * @internal
 */
export const withTechDocsReaderProvider =
  <T extends {}>(
    Component: ComponentType<T>,
    entityName: EntityName,
    onReady?: () => void,
  ) =>
  (props: T) =>
    (
      <TechDocsReaderProvider entityName={entityName} onReady={onReady}>
        <Component {...props} />
      </TechDocsReaderProvider>
    );

/**
 * Note: this hook is currently being exported so that we can rapidly
 * iterate on alternative <Reader /> implementations that extend core
 * functionality. There is no guarantee that this hook will continue to be
 * exported by the package in the future!
 *
 * todo: Make public or stop exporting (ctrl+f "altReaderExperiments")
 * @internal
 */
export const useTechDocsReader = () => useContext(TechDocsReaderContext);
