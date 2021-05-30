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

interface Post {
  first_publication_date: string | null;
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
}

interface Content {
  heading: string;
  body: {
    text: string;
  }[];
}

export default function Post({ post, }: PostProps) {
  
  const router = useRouter()
  if (router.isFallback) {
    return <div>Carregando...</div>
  }

  function calculateReadingTime(content: Content[]) {
    const text_length = content.reduce((acc, obj) => {
      const heading = obj.heading.split(/\s/g).length
      const body = obj.body.split(/\s/g).length

      return acc + (body + heading);
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
              {/* {calculateReadingTime(post.data.content)} min */}
              4 min
            </span>
          </div>

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

export const getStaticProps: GetStaticProps = async context => {
  const {slug} = context.params

  const prismic = getPrismicClient();
  const response = await prismic.getByUID('posts', String(slug), {});

  const content = response.data.content.map(content => (
    {
      heading: content.heading,
      body: RichText.asHtml(content.body)
    }
  ))
 
  const post = {
    uid: response.uid,
    first_publication_date: response.first_publication_date,
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
      post
    },
    revalidate: 60 * 30 //30 minutes
  }
};
