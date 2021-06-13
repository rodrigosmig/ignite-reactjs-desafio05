import { GetStaticPaths, GetStaticProps } from 'next';
import Prismic from '@prismicio/client';
import { RichText } from "prismic-dom";
import { getPrismicClient } from '../../services/prismic';
import { format } from 'date-fns';
import ptBR from 'date-fns/locale/pt-BR';

import styles from './post.module.scss';
import Header from '../../components/Header';
import { FiCalendar, FiUser, FiClock } from 'react-icons/fi';
import { useRouter } from 'next/router';
import React from 'react';
import Comments from '../../components/Comments';
import Link from 'next/link';

interface Post {
  first_publication_date: string | null;
  last_publication_date: string | null;
  data: {
    title: string;
    banner: {
      url: string;
    };
    author: string;
    content: {
      heading: string;
      body: {
        text: string;
      }[];
    }[];
  };
}

interface PostProps {
  post: Post;
  navigation: {
    prevPost: {
      uid: string,
      data: {
        title: string
      }
    }[],
    nextPost: {
      uid: string,
      data: {
        title: string
      }
    }[]
  }
  preview: boolean
}

interface Content {
  heading: string;
  body: {
    text: string;
  }[];
}

export default function Post({ post, navigation, preview }: PostProps) {
  
  const router = useRouter()
  if (router.isFallback) {
    return <div>Carregando...</div>
  }

  function calculateReadingTime(content: Content[]) {
    const text_length = content.reduce((acc, obj) => {
      const heading = obj.heading.split(/\s/g).length      
      const body = obj.body.map(body => {
        return body.text.split(/\s/g).length
      })
      const body_lenght = body.reduce((acc, value) => acc + value)

      return acc + (heading + body_lenght);
    }, 0)

    const reading_time = Math.ceil(text_length / 200);

    return reading_time;
  }

  return (
    <>
      <Header />
        <section className={styles.banner}>
          <img src={post.data.banner.url} alt="logo" />
        </section>

        <main className={styles.main} key={post.data.title}>
          <h1>{ post.data.title }</h1>
          <div className={styles.timeSection}>
            <FiCalendar className={styles.calendarIcon} />            
            <time>
              { format(
                new Date(post.first_publication_date),
                "dd MMM yyyy",
                {
                  locale: ptBR,
                }
              )}
            </time>            
            <FiUser className={styles.userIcon} />            
            <span>
              { post.data.author }
            </span>            
            <FiClock className={styles.clockIcon} />            
            <span>
              {calculateReadingTime(post.data.content)} min
            </span>
          </div>

          {post.last_publication_date !== post.first_publication_date 
            ? <time className={styles.editTime}>
                *editado em { format(
                    new Date(post.last_publication_date),
                    "dd MMM yyyy",
                    {
                      locale: ptBR,
                    }
                  )}, às { format(
                    new Date(post.last_publication_date),
                    "HH:mm",
                    {
                      locale: ptBR,
                    }
                  )}
              </time>
            : ''
          }          

          {post.data.content.map(content => (
            <article>
              <h2>
                {content.heading}
              </h2>
              <div className={styles.postBody}
                dangerouslySetInnerHTML={{__html: RichText.asHtml(content.body)}}
              />              
            </article>
          ))}

          <hr />

          <section className={styles.navigation}>
            { navigation?.prevPost.length > 0 && (
              <div>
                <h3>{navigation.prevPost[0].data.title}</h3>
                <Link href={`/post/${navigation.prevPost[0].uid}`}>
                  <a>Post anterior</a>
                </Link>
              </div>
            )}

            { navigation?.nextPost.length > 0 && (
              <div>
                <h3>{navigation.nextPost[0].data.title}</h3>
                <Link href={`/post/${navigation.nextPost[0].uid}`}>
                  <a>Próximo post</a>
                </Link>
              </div>
            )}
            
          </section>

          { preview && (
            <aside>
              <Link href="/api/exit-preview">
                <a className={styles.preview}>Sair do modo Preview</a>
              </Link>
            </aside>
          ) }

          <Comments />
          
        </main>
    </>
  )
}

export const getStaticPaths: GetStaticPaths = async () => {
  const prismic = getPrismicClient();
  const posts = await prismic.query([
    Prismic.predicates.at('document.type', 'posts')
  ], {
    fetch: [],
    orderings : '[document.first_publication_date desc]',
    pageSize: 2,
  });

  const paths = posts.results.map(post => (
    {
      params: { slug: post.uid }
    }
  ))

  return {
    paths,
    fallback: true
  }
};

export const getStaticProps: GetStaticProps = async ({
  params,
  preview = false,
  previewData
}) => {
  const {slug} = params;
  const prismic = getPrismicClient();
  const response = await prismic.getByUID('posts', String(slug), {
    ref: previewData?.ref || null
  });

  const prevPost = await prismic.query(
    [Prismic.Predicates.at('document.type', 'posts')],
    {
      pageSize: 1,
      after: response.id,
      orderings: '[document.first_publication_date]'
    }
  );

  const nextPost = await prismic.query(
    [Prismic.Predicates.at('document.type', 'posts')],
    {
      pageSize: 1,
      after: response.id,
      orderings: '[document.last_publication_date desc]'
    }
  )

  const post = {
    uid: response.uid,
    first_publication_date: response.first_publication_date,
    last_publication_date: response.last_publication_date,
    data: {
      title: response.data.title,
      subtitle: response.data.subtitle,
      author: response.data.author,
      banner: {
        url: response.data.banner.url
      },      
      content: response.data.content
    }
  }

  return {
    props: {
      post,
      navigation: {
        prevPost: prevPost?.results,
        nextPost: nextPost?.results
      },
      preview
    },
    revalidate: 60 * 30 //30 minutes
  }
};
